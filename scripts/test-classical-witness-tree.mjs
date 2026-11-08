// Árboles documentales: consistencia de testimonios, fechas y accesos.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const works=JSON.parse(read('data/bibliotheca-graeca-latina-I-bce-I-ce.json')).works;
const registry=JSON.parse(read('data/bibliotheca-testimonia-verified.json'));
const html=read('tradicion-textual-clasica.html'),js=read('assets/classical-witness-tree.js');
assert(html.includes('id="tree-work"')&&html.includes('id="tree-witnesses"')&&html.includes('id="tree-editions"'));
assert(html.includes('no un <em>stemma codicum</em>'), 'La página debe distinguir cronología documental de stemma');
assert(js.includes('ms.localViewer')&&js.includes('ms.viewer')&&js.includes('ms.record'),'Faltan enlaces comprobables de visores');
assert(js.includes('ms.dateStart')&&js.includes('Number(ms.dateStart)===earliest'),'Falta orden y destacado de la fecha de testimonio');
assert(js.includes('w.dating'),'Debe separarse composición de fecha de testimonio');
const ids=new Set(works.map(w=>w.id));
const witnesses=registry.records||[],editions=registry.editions||[];
for(const ms of witnesses){
 assert(ms.id&&ms.shelfmark&&ms.date&&Number.isFinite(ms.dateStart));
 assert(ms.library||ms.codexRepository,ms.id+' sin institución');
 assert(Array.isArray(ms.workIds)&&ms.workIds.length,ms.id+' sin obra');
 for(const id of ms.workIds)assert(ids.has(id),ms.id+' referencia obra desconocida: '+id);
}
for(const ed of editions)assert(ids.has(ed.workId),'Edición sin obra: '+ed.title);
const vitruvius=witnesses.filter(w=>(w.workIds||[]).includes('vitruvius'));
assert(vitruvius.length,'Falta el testimonio de Vitruvio');
const first=Math.min(...vitruvius.map(w=>w.dateStart));
assert(vitruvius.some(w=>w.dateStart===first&&(w.localViewer||w.viewer||w.record)),'Testimonio más antiguo sin acceso');
console.log('Árbol codicológico: '+works.length+' obras · '+witnesses.length+' testimonios · '+editions.length+' ediciones; cronología y procedencia documentadas.');
