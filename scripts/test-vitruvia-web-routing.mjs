import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=readFileSync(resolve(root,'assets/vitruvia-web-routing.js'),'utf8');
const context={window:{}};vm.runInNewContext(src,context);
const plan=context.window.VitruviaWebRouting.plan;
const includes=(q,identity,name)=>assert(plan(q,identity).providers.includes(name),q+' should request '+name);
const excludes=(q,identity,name)=>assert(!plan(q,identity).providers.includes(name),q+' should not request '+name);
includes('Cargas de viento y flexotorsión',null,'openAlex');
excludes('Cargas de viento y flexotorsión',null,'museum');
excludes('ecuaciones matemáticas',null,'googleBooks');
includes('Dalí',{description:'pintor y escultor español'},'museum');
includes('Palladio',{description:'arquitecto del Renacimiento italiano'},'museum');
includes('Mozart',{description:'compositor de música clásica'},'googleBooks');
includes('epidemia romana',null,'europePmc');
excludes('epidemia romana',null,'museum');
includes('Vitruvio manuscritos latinos',null,'openLibrary');
includes('arte barroco',null,'gettyAat');
for(const [q,identity] of [['Dalí',{description:'pintor y escultor español'}],['ingeniería',null],['filología clásica',null]]){
 const p=plan(q,identity);assert.equal(p.providers.length,new Set(p.providers).size);assert(p.providers.length<=8);
}
console.log('PASS: 11 academic source-routing scenarios');
