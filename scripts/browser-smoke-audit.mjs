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
 await test('Scriptorium C: contraste legible de cuadros y botones en claro y oscuro',async()=>{
  const page=await pageFor('cesariano-1521.html');
  await page.locator('#ces-gallery-panel').waitFor({state:'visible',timeout:15000});
  for(const mode of ['light','dark']){
   const observations=await page.evaluate(mode=>{
    document.documentElement.dataset.theme=mode;
    const rgb=s=>String(s).match(/[\d.]+/g)?.slice(0,3).map(Number)||[0,0,0];
    const lum=arr=>{
     const v=arr.map(c=>{const a=c/255;return a<=0.04045?a/12.92:((a+0.055)/1.055)**2.4;});
     return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];
    };
    const contrast=(a,b)=>{const x=lum(rgb(a)),y=lum(rgb(b));return ((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05));};
    const pairs=[
      ['#ces-gallery','#ces-gallery h2'],
      ['#ces-gallery','#ces-gallery p'],
      ['#ces-gallery','#ces-gallery form label'],
      ['#ces-gallery','#ces-ocr-details summary'],
      ['#ces-gallery-section','#ces-gallery-section'],
      ['#ces-gallery-query','#ces-gallery-query'],
      ['#ces-gallery #ces-gallery-form button[type="submit"]','#ces-gallery #ces-gallery-form button[type="submit"]'],
      ['#ces-gallery .ces-image-card','#ces-gallery .ces-image-card .ces-image-number'],
      ['.ces-label','.ces-label strong']
    ];
    return pairs.map(([surface,foreground])=>{
      const bg=getComputedStyle(document.querySelector(surface)).backgroundColor;
      const fg=getComputedStyle(document.querySelector(foreground)).color;
      return {surface,foreground,bg,fg,ratio:contrast(bg,fg)};
    });
   },mode);
   console.log('CESARIANO CONTRASTE '+mode.toUpperCase()+': '+JSON.stringify(observations));
   for(const x of observations)assert(x.ratio>=4.5,
    'Contraste '+mode+' insuficiente en '+x.foreground+': '+x.ratio.toFixed(2)+' ('+x.fg+' sobre '+x.bg+')');
  }
  await page.close();
 });
 await test('Portada: accesos S G C B visibles y legibles en ambos temas',async()=>{
   const page=await pageFor('index.html');
   const links=['sulpizio-1486.html','giocondo-1511.html','cesariano-1521.html','barbaro-1567.html'];
   for(const href of links){
     const item=page.locator('.hero-scriptoria-grid a[href="'+href+'"]');
     assert.equal(await item.count(),1,'Falta acceso de portada: '+href);
     assert(await item.isVisible(),'Acceso no visible en portada: '+href);
   }
   await page.evaluate(()=>document.documentElement.dataset.theme='dark');
   const result=await page.locator('.hero-scriptoria-grid a').first().evaluate(el=>({
     fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor,
     title:getComputedStyle(el.querySelector('strong')).color
   }));
   assert.notEqual(result.fg,result.bg,'Botón oscuro de portada ilegible');
   assert.notEqual(result.title,result.bg,'Nombre Sulpizio de portada ilegible');
   await page.close();
 });
 await test('Scriptorium B y G: galería, navegación y modo oscuro',async()=>{
  for(const record of [
    {letter:'B',path:'barbaro-1567.html',total:522,prefix:'bar',first:173,last:214},
    {letter:'G',path:'giocondo-1511.html',total:254,prefix:'gio',first:73,last:97}
  ]){
    const page=await pageFor(record.path);
    await page.locator('#'+record.prefix+'-gallery-panel').waitFor({state:'visible',timeout:16000});
    const buttons=page.locator('#'+record.prefix+'-gallery-results button[data-'+record.prefix+'-image]');
    assert.equal(await buttons.count(),24,'Faltan miniaturas en galería '+record.letter);
    await page.locator('#'+record.prefix+'-gallery-section').selectOption('4');
    assert.equal(Number(await buttons.first().getAttribute('data-'+record.prefix+'-image')),record.first,'Libro IV inicia mal en '+record.letter);
    assert(Number(await buttons.last().getAttribute('data-'+record.prefix+'-image'))<=record.last,'Libro IV fuera de intervalo en '+record.letter);
    await page.locator('#'+record.prefix+'-gallery-clear').click();
    await page.locator('#'+record.prefix+'-gallery-query').fill('imagen 100');
    await page.locator('#'+record.prefix+'-gallery-form button[type=submit]').click();
    assert.equal(await buttons.count(),1,'Búsqueda imagen 100 no devuelve exactamente una en '+record.letter);
    await buttons.first().click();
    assert.equal(await page.locator('#'+record.prefix+'-page').inputValue(),'100','Miniatura no abre página 100 en '+record.letter);
    assert.match(await page.locator('#'+record.prefix+'-counter').innerText(),new RegExp('100\\s*/\\s*'+record.total),'Contador incorrecto '+record.letter);
    await page.evaluate(()=>document.documentElement.dataset.theme='dark');
    const colors=await page.locator('#'+record.prefix+'-gallery').evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
    assert.notEqual(colors.fg,colors.bg,'Colores indistinguibles '+record.letter);
    await page.close();
  }
 });
 await test('Scriptorium S: ficha y enlaces de facsímil',async()=>{
   const page=await pageFor('sulpizio-1486.html');
   assert.match(await page.locator('h1').innerText(),/Sulpizio/);
   assert(await page.locator('a[href*="architectura.univ-tours.fr"]').count()>0,'Falta ficha Architectura');
   await page.close();
 });
 await test('Scriptorium: selector abre Barbaro, Giocondo y Sulpizio',async()=>{
   const list=[['print:barbaro-1567','barbaro-1567.html'],['print:giocondo-1511','giocondo-1511.html'],['print:sulpizio-1486','sulpizio-1486.html']];
   for(const [source,path] of list){
     const page=await pageFor('scriptorium.html');
     assert.equal(await page.locator('#source option[value="'+source+'"]').count(),1,'Falta opción '+source);
     await page.locator('#source').selectOption(source);
     await page.waitForURL(new RegExp(path.replace('.','\\.')), {timeout:12000});
     await page.close();
   }
 });
 await test('Scriptorium C: botón directo y selector abren Cesariano',async()=>{
  const page=await pageFor('scriptorium.html');
  assert.equal(await page.locator('a[href="cesariano-1521.html"]').count()>0,true,'No aparece botón C');
  assert.equal(await page.locator('#source option[value="print:cesariano-1521"]').count(),1,'No aparece Cesariano en el selector');
  await page.locator('#source').selectOption('print:cesariano-1521');
  await page.waitForURL(/cesariano-1521\.html/, {timeout:12000});
  assert.match(await page.locator('h1').innerText(),/Scriptorium C/,'No aparece el título de Scriptorium C');
  await page.locator('#ces-gallery-panel').waitFor({state:'visible',timeout:18000});
  assert.equal(await page.locator('#ces-gallery-results [data-ces-image]').count(),24,'La galería C no muestra las primeras 24 imágenes');
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
