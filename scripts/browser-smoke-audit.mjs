import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import assert from 'node:assert/strict';

const base='http://127.0.0.1:8765/';
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
const failures=[];
async function test(name,fn){try{await fn();console.log('PASS',name)}catch(e){failures.push(name+': '+e.message);console.error('FAIL',name,e.message)}}
async function pageFor(path){const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>{failures.push(path+': JS error: '+e.message)});const response=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response.status(),200,path+' HTTP');return page}
try{
 await sleep(1800);
 browser=await chromium.launch({headless:true});
 for(const path of ['index.html','scriptorium.html','facsimiles.html','bibliografia.html','ediciones-historicas.html','concordancia-historica.html','estudios.html','harleianus.html']){
  await test('Carga '+path,async()=>{const page=await pageFor(path);await page.waitForTimeout(1500);await page.close()});
 }
 await test('Cesariano 1521: galería visual, libro IV y búsqueda por imagen exacta',async()=>{
  const page=await pageFor('cesariano-1521.html');
  await page.locator('#ces-gallery-panel').waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('#ces-gallery-results button[data-ces-image]').count(),24,'No aparecen las primeras 24 miniaturas');
  const jpeg=await page.request.get(base+'images/cesariano-1521/0150.jpg',{timeout:30000});
  assert.equal(jpeg.status(),200,'La imagen local 0150.jpg no se sirve');
  assert.deepEqual([...((await jpeg.body()).subarray(0,3))],[255,216,255],'Imagen 150 no es JPEG válido');
  await page.locator('#ces-gallery-section').selectOption('4');
  assert.equal(await page.locator('#ces-gallery-results button[data-ces-image]').count(),22,'Libro IV debe conservar las 22 imágenes del manifiesto');
  assert.equal(await page.locator('#ces-gallery-results button[data-ces-image]').first().getAttribute('data-ces-image'),'128');
  assert.equal(await page.locator('#ces-gallery-results button[data-ces-image]').last().getAttribute('data-ces-image'),'149');
  await page.locator('#ces-gallery-clear').click();
  await page.locator('#ces-gallery-query').fill('imagen 150');
  await page.locator('#ces-gallery-form button[type=submit]').click();
  assert.equal(await page.locator('#ces-gallery-results button[data-ces-image]').count(),1,'Búsqueda por imagen no localiza exactamente la página 150');
  await page.locator('#ces-gallery-results button[data-ces-image="150"]').click();
  assert.equal(await page.locator('#ces-page').inputValue(),'150','La miniatura no abre la imagen 150');
  assert.match(await page.locator('#ces-counter').innerText(),/150\s*\/\s*390/,'Contador de lectura incorrecto');
  await page.close();
 });
 await test('Scriptorium: todos los PDF locales sirven archivos PDF',async()=>{
  const page=await pageFor('scriptorium.html');
  const sources=['documents/krohn-1912.pdf','documents/kurilo-recensio-es.pdf','documents/kurilo-recensio-fr.pdf','documents/kurilo-theory-en.pdf'];
  for(const path of sources){
   const response=await page.request.get(base+path,{timeout:30000});
   assert.equal(response.status(),200,path);
   assert.match(response.headers()['content-type']||'',/pdf/i,path+' content-type');
   assert((await response.body()).subarray(0,5).toString()==='%PDF-',path+' signature');
  }
  await page.close();
 });
 await test('Scriptorium: botones y campo de página presentes',async()=>{
  const page=await pageFor('scriptorium.html');
  for(const id of ['source','page','prev-page','next-page','load','zoom','brightness','contrast','grayscale','sepia','loupe','reset']) assert.equal(await page.locator('#'+id).count(),1,'Falta #'+id);
  for(const value of ['pdf:krohn','pdf:rose-1899','pdf:ortiz-1787','own:recensio-es','own:recensio-fr','own:theory-en']) assert.equal(await page.locator('#source option[value="'+value+'"]').count(),1,'Falta edición '+value);
  await page.close();
 });
 await test('Scriptorium: V554 abre la página 345 con PDF.js o muestra alternativa',async()=>{
   const page=await pageFor('scriptorium.html');
   await page.locator('#source').selectOption('own:recensio-fr');
   await page.locator('#page').fill('345');
   await page.locator('#load').click();
   await page.waitForTimeout(4000);
   const info=await page.locator('#state').innerText();
   const image=await page.locator('#folio').evaluate(el=>Boolean(el.naturalWidth&&el.naturalHeight));
   const iframe=await page.locator('#drive-frame').getAttribute('src');
   const backup=await page.locator('#pdf-open-original').getAttribute('href');
   console.log('PDF DIAG:',JSON.stringify({info,image,iframe,backup}));
   assert(backup?.includes('kurilo-recensio-fr.pdf'),'Falta enlace directo al PDF de V554');
   assert(image||(iframe||'').includes('kurilo-recensio-fr.pdf#page=345'),'No hay imagen ni lector PDF para la página 345');
   await page.close();
 });
 await test('Scriptorium: los cambios de fuente activan navegación',async()=>{
  const page=await pageFor('scriptorium.html');
  for(const source of ['pdf:krohn','own:recensio-es','own:recensio-fr','own:theory-en']){
   await page.locator('#source').selectOption(source);
   assert.equal(await page.locator('#page').inputValue(),'1',source+' no reinicia página');
   assert.equal(await page.locator('#page').isDisabled(),false);
   await page.locator('#page').fill('16');
   await page.locator('#load').click();
   assert.equal(await page.locator('#page').inputValue(),'16',source+' no acepta página 16');
  }
  await page.close();
 });
 await test('Portada: búsqueda, ejemplos, catálogo y comparación',async()=>{
  const page=await pageFor('index.html');
  await page.locator('[data-query="symmetria"]').click();
  assert.match(await page.locator('#query').inputValue(),/symmetria/i,'Ejemplo de búsqueda sin efecto');
  await page.locator('#query').fill('architectura');
  await page.locator('#search-button').click();
  await page.waitForTimeout(1200);
  assert((await page.locator('body').innerText()).length>500,'La portada perdió contenido');
  await page.locator('[data-category="historical"]').click();
  assert.equal(await page.locator('[data-category="historical"]').getAttribute('aria-selected'),'true','Pestaña histórica no selecciona');
  await page.locator('#open-comparison').click();
  await page.waitForTimeout(250);
  await page.close();
 });
 await test('Bibliografía: botones de ejemplo y restablecer filtros',async()=>{
  const page=await pageFor('bibliografia.html');
  await page.locator('[data-example="Gudianus"]').click();
  assert.match(await page.locator('#filter').inputValue(),/Gudianus/,'Ejemplo Gudianus no funciona');
  await page.locator('#clear-filters').click();
  assert.equal(await page.locator('#filter').inputValue(),'','No se restablece el filtro');
  await page.close();
 });
 await test('Enlaces de Scriptorium desde portada y catálogos',async()=>{
  for(const path of ['index.html','facsimiles.html','bibliografia.html','ediciones-historicas.html','concordancia-historica.html']){
   const page=await pageFor(path);
   assert(await page.locator('a[href="scriptorium.html"]').count()>0,path+' no enlaza Scriptorium');
   await page.close();
  }
 });
}finally{await browser?.close();server.kill()}
if(failures.length){console.error('\nAUDITORIA CON FALLOS\n'+failures.join('\n'));process.exitCode=1}else console.log('\nAuditoría básica de navegador completada sin fallos.');
