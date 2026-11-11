/* ¿Llega esta hoja de estilo al navegador?
 *
 * Varias pruebas comprobaban que una página enlazara una hoja concreta con su
 * cadena de versión exacta. Desde que las hojas contiguas se agrupan en un
 * paquete (scripts/build-style-bundles.mjs), el enlace individual ya no está:
 * lo que está es el paquete, que lleva la hoja dentro y su propia huella.
 *
 * La garantía que buscaban esas pruebas —que la hoja llegue, y con huella para
 * que el navegador no sirva una copia vieja— sigue siendo comprobable, y es lo
 * que comprueba esta función. Lo que ya no se puede exigir es una cadena de
 * versión concreta por hoja: el paquete tiene una sola, calculada sobre su
 * contenido, de modo que cambia sola cuando cambia cualquiera de sus hojas.
 */
import {readFileSync,existsSync} from "node:fs";

const escape=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

export function stylesheetLoaded(html,file){
 const plain=String(file).split("?")[0];
 const direct=new RegExp('href="'+escape(plain)+'(\\?[^"]*)?"');
 const hit=html.match(direct);
 if(hit)return {loaded:true,via:"enlace directo",fingerprinted:/\?v=/.test(hit[0])};
 for(const bundle of html.matchAll(/href="(assets\/bundle-[^"?]+)(\?v=([^"]+))?"/g)){
  const path=bundle[1];
  if(!existsSync(path))continue;
  if(readFileSync(path,"utf8").includes("/* ===== "+plain+" ===== */"))
   return {loaded:true,via:path,fingerprinted:!!bundle[3]};
 }
 return {loaded:false,via:null,fingerprinted:false};
}

/* Para usar directamente en un assert: devuelve true sólo si la hoja llega y
   lleva huella, y explica por qué no cuando falla. */
export function assertStylesheet(assert,html,file,label){
 const result=stylesheetLoaded(html,file);
 assert.ok(result.loaded,(label||file)+": la hoja no llega a la página, ni directamente ni dentro de un paquete");
 assert.ok(result.fingerprinted,(label||file)+": llega por "+result.via+" pero sin huella de versión");
 return result;
}

/* Orden real de la cascada: la secuencia de hojas tal como las recibe el
   navegador, desplegando los paquetes en las hojas que contienen. Sirve para
   las comprobaciones de precedencia, que el empaquetado no debe alterar. */
export function stylesheetOrder(html){
 const out=[];
 for(const link of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gi)){
  const href=(link[0].match(/href="([^"]+)"/)||[])[1];
  if(!href)continue;
  const plain=href.split("?")[0];
  if(/^assets\/bundle-/.test(plain)&&existsSync(plain)){
   for(const source of readFileSync(plain,"utf8").matchAll(/\/\* ===== (\S+) ===== \*\//g))out.push(source[1]);
  }else out.push(plain);
 }
 return out;
}

/* Posición en el documento del enlace que entrega la hoja: el suyo si va
   suelta, o el del paquete que la contiene. Las comprobaciones de precedencia
   frente a bloques <style> en línea necesitan esta posición y no la del nombre
   del archivo, que dentro de un paquete ya no aparece en la página. */
export function stylesheetPosition(html,file){
 const plain=String(file).split("?")[0];
 for(const link of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gi)){
  const href=(link[0].match(/href="([^"]+)"/)||[])[1];
  if(!href)continue;
  const target=href.split("?")[0];
  if(target===plain)return link.index;
  if(/^assets\/bundle-/.test(target)&&existsSync(target)&&
   readFileSync(target,"utf8").includes("/* ===== "+plain+" ===== */"))return link.index;
 }
 return -1;
}
