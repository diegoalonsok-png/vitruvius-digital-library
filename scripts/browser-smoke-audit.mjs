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
 await test('Scriptorium: todos los PDF locales sirven archivos PDF',async()=>{
  const page=await pageFor('scriptorium.html');
  const sources=['documents/krohn-1912.pdf','documents/kurilo-recensio-es.pdf','documents/kurilo-recensio-fr.pdf','documents/kurilo-theory-en.pdf'];
  for(const path of sources){
   const response=await page.request.get(base+path,{timeout:30000});
   assert.equal(response.status(),200,path);
   assert.match(response.headers()['content-type']||'','pdf',path+' content-type');
   assert((await response.body()).subarray(0,5).toString()==='%PDF-',path+' signature');
  }
  await page.close();
 });
 await test('Scriptorium: botones y campo de página presentes',async()=>{
  const page=await pageFor('scriptorium.html');
  for(const id of ['source','page','prev-page','next-page','load','zoom','brightness','contrast','grayscale','sepia','loupe','reset']) assert.equal(await page.locator('#'+id).count(),1,'Falta #'+id);
  assert.equal(await page.locator('#source option').count(),5,'Selector debe mostrar solamente cinco lectores');
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
 await test('Enlaces de Scriptorium desde portada y catálogos',async()=>{
  for(const path of ['index.html','facsimiles.html','bibliografia.html','ediciones-historicas.html','concordancia-historica.html']){
   const page=await pageFor(path);
   assert(await page.locator('a[href="scriptorium.html"]').count()>0,path+' no enlaza Scriptorium');
   await page.close();
  }
 });
}finally{await browser?.close();server.kill()}
if(failures.length){console.error('\nAUDITORIA CON FALLOS\n'+failures.join('\n'));process.exitCode=1}else console.log('\nAuditoría básica de navegador completada sin fallos.');
