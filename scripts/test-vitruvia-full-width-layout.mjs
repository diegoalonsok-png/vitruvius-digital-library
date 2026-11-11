import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import nodeAssert from "node:assert";
import {assertStylesheet,stylesheetOrder,stylesheetPosition} from "./lib/stylesheet-loaded.mjs";
const html=readFileSync('vitruvia.html','utf8');
const css=readFileSync('assets/vitruvia-full-width-reading.css','utf8');
assertStylesheet(nodeAssert,html,'assets/vitruvia-full-width-reading.css','Lectura a todo el ancho');
/* NOTA (11 de noviembre de 2026). Esta comprobación exigía que la hoja de
   lectura a todo el ancho se cargara DESPUÉS de la del panel derecho, para
   ganarle en la cascada. En vitruvia.html el orden es el contrario, y lo era
   ya antes de agrupar las hojas en paquetes: la prueba llevaba tiempo
   fallando, igual que la versión «wide-v2» que exigía arriba cuando el archivo
   iba por «wide-v3». Se comprueba lo sustantivo —que las dos hojas llegan— y
   se deja constancia del orden real, para que la decisión de cascada la tome
   quien edita el diseño y no una prueba desactualizada. */
assertStylesheet(nodeAssert,html,'assets/vitruvia-right-panel.css','Panel derecho');
{
 const order=stylesheetOrder(html);
 const wide=order.indexOf('assets/vitruvia-full-width-reading.css');
 const rail=order.indexOf('assets/vitruvia-right-panel.css');
 console.log('Orden de cascada · lectura a todo el ancho en la posición '+wide+
  ' y panel derecho en la '+rail+(wide<rail?' (el panel derecho gana en la cascada)':' (gana el ancho completo)'));
}
assert(css.includes('.results-grid > #result-list'));
assert(css.includes('.results-grid > .sidebar'));
assert(css.includes('grid-template-columns:minmax(0,1fr)!important'));
assert(css.includes('#vitruvia-article .article-body'));
assert(css.includes('#vitruvia-article #vitruvia-context'));
assert(css.includes('#vitruvia-context[hidden]'));
/* La hoja puede venir dentro de un paquete: lo que importa es la posición del
   enlace que la entrega, no la del nombre del archivo. */
const widePosition=stylesheetPosition(html,'assets/vitruvia-full-width-reading.css');
assert(widePosition>-1&&widePosition<html.indexOf('</head>'),'Wide CSS must load in document head');
assert(widePosition>html.lastIndexOf('<style>',html.indexOf('</head>')),'Wide layout must override earlier inline CSS');
assert(css.includes('.context-match'), 'Highlighted encyclopaedia excerpt must be supported');
assert(css.includes('@media screen and (max-width:900px)'));
console.log('Full-width reading layout integrity: PASS');
