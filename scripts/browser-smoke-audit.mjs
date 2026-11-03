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
 await test('Portada: franja H S G C B a la vista en la primera pantalla',async()=>{
   const page=await pageFor('index.html');
   await page.setViewportSize({width:1850,height:830});
   const bar=page.locator('.historic-top-access');
   assert(await bar.isVisible(),'La franja de facsimiles no aparece');
   const pos=await bar.boundingBox();
   assert(pos&&pos.y>=0&&pos.y+pos.height<=830,'La franja quedo fuera de primera pantalla');
   for(const [name,href] of [['H','harleianus.html'],['S','sulpizio-1486.html'],['G','giocondo-1511.html'],['C','cesariano-1521.html'],['B','barbaro-1567.html']]){
     const link=bar.locator('a[href="'+href+'"]');
     assert.equal(await link.count(),1,'Falta boton '+name);
     assert(await link.isVisible(),'Boton oculto '+name);
     assert.equal((await link.locator('b').innerText()).trim(),name);
     const box=await link.boundingBox();
     assert(box&&box.x>=0&&box.x+box.width<=1850,'Boton se sale de pantalla '+name);
   }
   await page.evaluate(()=>document.documentElement.dataset.theme='dark');
   const color=await bar.locator('a').first().evaluate(el=>({color:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
   assert.notEqual(color.color,color.bg,'Texto ilegible en modo oscuro');
   await page.close();
 });
 await test('Portada: accesos S G C B visibles y legibles en ambos temas',async()=>{
   const page=await pageFor('index.html');
   const links=['sulpizio-1486.html','giocondo-1511.html','cesariano-1521.html','barbaro-1567.html'];
   for(const href of links){
     const item=page.locator('.hero-scriptoria-grid a[href="'+href+'"]');
     assert.equal(await item.count(),1,'Falta acceso de portada: '+href);
     assert(await item.isVisible(),'Acceso no visible en portada: '+href);
     const header=page.locator('.historic-top-links a[href="'+href+'"]');
     assert.equal(await header.count(),1,'Falta botón grande de portada: '+href);
     assert(await header.isVisible(),'Botón grande oculto: '+href);
   }
   assert.equal(await page.locator('.research-prints a').count(),0,'Aún figuran botones pequeños duplicados');
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
 await test('Scriptorium S: 205 imágenes locales, galería y búsqueda 27v',async()=>{
   const page=await pageFor('sulpizio-1486.html');
   assert.match(await page.locator('h1').innerText(),/Sulpizio/);
   await page.locator('#su-grid button[data-page]').first().waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('#su-grid button[data-page]').count(),24,'La galería S no presenta 24 miniaturas iniciales');
   const jpeg=await page.request.get(base+'images/sulpizio-1486/0058.jpg',{timeout:15000});
   assert.equal(jpeg.status(),200,'El folio 27v local no se sirve');
   assert.deepEqual([...((await jpeg.body()).subarray(0,3))],[255,216,255],'El folio 27v no es JPEG');
   await page.locator('#su-folio').fill('27v');
   await page.locator('#su-find').click();
   assert.equal(await page.locator('#su-page').inputValue(),'58','27v debe ser imagen 58');
   await page.locator('#su-query').fill('imagen 59');
   await page.locator('#su-search').click();
   assert.equal(await page.locator('#su-grid button[data-page]').count(),1,'Búsqueda imagen 59 debe devolver un resultado');
   await page.locator('#su-grid button[data-page="59"]').click();
   assert.equal(await page.locator('#su-page').inputValue(),'59','La miniatura 59 no abre su folio');
   await page.evaluate(()=>document.documentElement.dataset.theme='dark');
   const colors=await page.locator('#su-gallery').evaluate(el=>({foreground:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
   assert.notEqual(colors.foreground,colors.background,'El buscador S es ilegible en modo oscuro');
   assert(await page.locator('a[href*="digitale-sammlungen.de"]').count()>0,'Falta atribución BSB');
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
 await test('Buscador principal: latín fijo y traducciones ES FR EN del mismo locus',async()=>{
   const page=await pageFor('index.html');
   await page.locator('#query').fill('II.7.2');
   await page.locator('#search-button').click();
   const first=page.locator('#search-results .result-parallel').first();
   await first.waitFor({state:'visible',timeout:25000});
   assert.equal(await page.locator('#search-results .parallel-columns').count(),1,'Un locus repetido debe aparecer una vez como pareja');
   assert.match(await first.locator('.parallel-latin').innerText(),/Sed haec|haec omnia/i,'No aparece el latín de II.7.2');
   const latinBefore=await first.locator('.parallel-latin .parallel-passage').innerText();
   const translated=first.locator('.parallel-translation-text');
   await page.waitForFunction(()=>{
     const t=document.querySelector('.parallel-translation-text')?.textContent||'';
     return t.length>80&&!/Cargando traducción|No se pudo cargar/.test(t);
   },null,{timeout:25000});
   const spanish=await translated.innerText();
   assert.match(await first.locator('.parallel-translation-source').innerText(),/V514/,'Falta atribución V514');
   await first.locator('.parallel-language').selectOption('fr');
   await page.waitForFunction(()=>document.querySelector('.parallel-translation-source')?.textContent?.includes('V554'),null,{timeout:25000});
   const french=await translated.innerText();
   assert(french.length>80&&french!==spanish,'El cambio a francés no actualiza la traducción');
   assert.equal(await first.locator('.parallel-latin .parallel-passage').innerText(),latinBefore,'El texto latino cambió de forma indebida');
   await first.locator('.parallel-language').selectOption('en');
   await page.waitForFunction(()=>document.querySelector('.parallel-translation-source')?.textContent?.includes('V297'),null,{timeout:25000});
   const english=await translated.innerText();
   assert(english.length>80&&english!==french,'El cambio a inglés no actualiza la traducción');
   assert.equal(await first.locator('.parallel-latin .parallel-passage').innerText(),latinBefore,'El latín cambió al seleccionar inglés');
   assert(await first.locator('.parallel-translation').isVisible(),'Columna derecha no visible');
   await page.close();
 });
 await test('Index codicum internacional: 78 registros y sin nuevos visores',async()=>{
   const page=await pageFor('index-codicum.html');
   assert(await page.locator('a[href="https://catalogue.etoncollege.com/B50099"]').count()>0,'Falta Eton MS 137');
   assert(await page.locator('a[href="https://gallica.bnf.fr/ark:/12148/btv1b9066098j"]').count()>0,'Falta Parisinus lat. 10277');
   assert(await page.locator('a[href*="31fffbc12aa4358a793393a55a30643bc94b4a62"]').count()>0,'Falta Laurenziana Plut.30.13');
   const data=await page.request.get(base+'data/corpus-expansion-inventory.json');
   assert.equal(data.status(),200);
   const inventory=await data.json();
   assert(inventory.records.length>=78,'Se perdieron registros del inventario');
   for(const label of ['hist-077','hist-078']){
     const item=inventory.records.find(x=>x.id===label);
     assert(item,'Falta registro '+label);
     assert(item.view_url&&item.searchable===false&&item.document_url===null,'El registro debe ofrecer solo enlace externo '+label);
   }
   assert.equal(await page.locator('iframe[src*="Eton"], iframe[src*="gallica"], img[src*="Eton"]').count(),0,'No se admiten copias o visores añadidos');
   await page.close();
 });
 await test('Catálogo de cinco códices Vaticanos sin reproducción de imágenes',async()=>{
   const page=await pageFor('codices-vaticanos.html');
   assert.equal(await page.locator('article.ms').count(),5,'Se esperan cinco signaturas de testimonios');
   assert(await page.locator('a[href="https://digi.vatlib.it/view/MSS_Urb.lat.293/0196"]').count()>0,'Falta facsímil institucional Urb. lat. 293');
   assert.match(await page.locator('.rights').innerText(),/autoriza|permiso|autorización/i,'Advertencia sobre reutilización obligatoria');
   assert.equal(await page.locator('img').count(),0,'No deben cargarse imágenes protegidas del Vaticano');
   await page.evaluate(()=>document.documentElement.dataset.theme='dark');
   const colors=await page.locator('.ms').first().evaluate(el=>({text:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
   assert.notEqual(colors.text,colors.bg,'El catálogo vaticano es ilegible en oscuro');
   await page.close();
 });
 await test('Docencia Roma antigua: siete seminarios, traducciones y notas',async()=>{
   const page=await pageFor('docencia-roma-antigua.html');
   assert.match(await page.locator('h1').innerText(),/Roma antigua/);
   const modules=page.locator('.module');
   assert.equal(await modules.count(),7,'Deben existir siete unidades');
   assert.equal(await modules.locator('a[href*="lector-bilingue.html"]').count(),21,'Se esperan tres idiomas por unidad');
   assert.equal(await modules.locator('a[href*="aparato-critico.html?locus="]').count(),7,'Notas académicas ausentes');
   await modules.first().locator('a[href*="edition=recensio-es"]').first().click();
   await page.waitForURL(/lector-bilingue\.html\?edition=recensio-es.*locus=1\.1\.1/,{timeout:15000});
   await page.close();
   const home=await pageFor('index.html');
   assert(await home.locator('a[href="docencia-roma-antigua.html"]').count()>0,'No hay acceso a la guía en portada');
   await home.close();
 });
 await test('Dossier académico: página visible, ficha de bibliotecas y registros bibliográficos',async()=>{
   const page=await pageFor('bibliotecas-universitarias.html');
   assert.match(await page.locator('h1').innerText(),/Vitruvius Digital Library/);
   assert.match(await page.locator('body').innerText(),/independiente/i,'Falta transparencia editorial');
   assert.equal(await page.locator('a[href="https://libguides.cam.ac.uk/c.php?g=363717&p=4973030"]').count(),1,'La referencia de Cambridge no aparece en el dossier');
   assert.match(await page.locator('#referencia-universitaria').innerText(),/No supone afiliación/,'Debe explicitar falta de aval institucional');
   assert(await page.locator('a[href="documents/edicion-v514.html"]').count()>0,'Falta V514');
   assert(await page.locator('a[href="documents/edicion-v554.html"]').count()>0,'Falta V554');
   assert(await page.locator('a[href="documents/edicion-v297.html"]').count()>0,'Falta V297');
   for(const [path,token] of [
     ['bibliotecas/vitruvius-biblioteca.ris','10.5281/zenodo.23868911'],
     ['bibliotecas/vitruvius-biblioteca.bib','Kurilo2026VitruviusDigitalLibrary'],
     ['bibliotecas/vitruvius-biblioteca.jsonld','https://schema.org']
   ]){
     const resp=await page.request.get(base+path);
     assert.equal(resp.status(),200,'Archivo de metadatos inaccesible: '+path);
     assert((await resp.text()).includes(token),'Archivo de metadatos incompleto: '+path);
   }
   await page.evaluate(()=>document.documentElement.dataset.theme='dark');
   const colors=await page.locator('.library-panel').first().evaluate(el=>({
      fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor
   }));
   assert.notEqual(colors.fg,colors.bg,'Panel bibliotecario ilegible en oscuro');
   await page.close();
   const home=await pageFor('index.html');
   assert.equal(await home.locator('a[href="bibliotecas-universitarias.html"]').count()>0,true,
     'Falta enlace desde la portada al dossier universitario');
   await home.close();
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

 await test('Onomasticon: personajes, lugares, loci, palabras por capítulo y formas latinas',async()=>{
   const page=await pageFor('onomasticon.html');
   await page.waitForFunction(()=>document.querySelector('#ov-count-person')?.textContent.trim()==='32',{timeout:20000});
   assert.equal((await page.locator('#ov-count-place').innerText()).trim(),'27');
   assert.equal((await page.locator('#ov-count-latin').innerText()).trim(),'57.639');
   assert.equal((await page.locator('#ov-count-greek').innerText()).trim(),'283');
   assert.equal((await page.locator('#ov-count-loci').innerText()).trim(),'731');
   assert.match(await page.locator('#ov-detail').innerText(),/Arquímedes de Siracusa/);
   assert(await page.locator('#ov-detail a[href*="locus=9.praef.9"]').count()>0,'Falta locus de Arquímedes');
   await page.locator('#ov-search').fill('Siracusa');
   assert(await page.locator('#ov-list button').count()>0,'Falta índice y búsqueda de Siracusa');
   await page.locator('#ov-clear').click();
   await page.locator('#ov-show-stats').click();
   assert(await page.locator('#ov-books tbody tr').count()===10,'La estadística no cubre diez libros');
   assert(await page.locator('#ov-chapters tbody tr').count()>5,'Faltan datos por capítulo');
   assert(await page.locator('#ov-verbs .ov-verb-row').count()>3,'No se representan tiempos latinos');
   await page.close();
 });
 await test('Laboratorio H: latín legible y correspondencia con el prefacio completo de 1r',async()=>{
   const page=await pageFor('laboratorio-h.html');
   assert.match(await page.locator('#paleo-panel h2').innerText(),/Transcripción latina/);
   await page.locator('#carolina-output').waitFor({state:'visible',timeout:10000});
   const input=(await page.locator('#carolina-output').innerText()).trim();
   assert(input.startsWith('VITRVVII DE ARCHITECTVRA LIB I'),'No se representa el incipit manuscrito');
   assert(input.includes('imperator caesar'),'No aparece la continuación en minúsculas');
   const font=await page.locator('#carolina-output').evaluate(e=>getComputedStyle(e).fontFamily);
   assert.match(font,/Georgia|Times New Roman/,'Sigue presente la tipografía experimental ilegible');
   await page.waitForFunction(()=>document.querySelector('#reading-output')?.textContent.includes('I.praef.2'),{timeout:20000});
   assert.match(await page.locator('#reading-output').innerText(),/I\.praef\.1/);
   assert.match(await page.locator('#reading-output').innerText(),/I\.praef\.2/);
   await page.close();
 });

 await test('Concordancia H: relaciones verificables, 1v sin inventar pasajes, búsqueda integral',async()=>{
   const page=await pageFor('concordancia-folios.html');
   await page.waitForFunction(()=>document.querySelector('#f-latin')?.textContent.includes('1.praef.2'),{timeout:18000});
   assert.match(await page.locator('#f-latin-status').innerText(),/provisional/i,'Folio 1r no identificado como provisional');
   assert.match(await page.locator('#f-evidence').innerText(),/imagen 9/,'Imagen 1r incorrecta');
   assert(await page.locator('#f-open[href*="image=9"]').count()>0,'El enlace directo a H no lleva a imagen 9');
   await page.locator('#f-folio').selectOption('1v');
   assert.match(await page.locator('#f-evidence').innerText(),/imagen 10/,'Imagen del 1v distinta de 10');
   assert.match(await page.locator('#f-latin').innerText(),/No hay transcripción ni pasaje/);
   assert.match(await page.locator('#f-translation').innerText(),/Traducción no asignada/);
   await page.locator('#f-search').fill('9.praef.10');
   assert.match(await page.locator('#f-search-count').innerText(),/1 loci?/);
   await page.locator('#f-search-results button').first().click();
   assert.equal(await page.locator('#f-folio').inputValue(),'','No se debe atribuir folio a IX.praef.10');
   assert.match(await page.locator('#f-evidence').innerText(),/Sin asignación material/);
   assert.match(await page.locator('#f-latin').innerText(),/Archimed/i);
   await page.locator('#f-lang').selectOption('en');
   await page.waitForFunction(()=>document.querySelector('#f-translation-status')?.textContent.includes('English'),{timeout:15000}).catch(()=>{});
   assert(await page.locator('#f-translation').innerText().then(t=>t.length>60),'Falta traducción en el locus');
   await page.close();
 });
 await test('Cabecera principal: Laboratorio H y Claro juntos sin superposición',async()=>{
   const page=await pageFor('index.html');
   const lab=page.locator('.research-nav-controls .research-lab-button');
   const theme=page.locator('.research-nav-controls .theme-switch');
   await theme.waitFor({state:'visible',timeout:8000});
   const a=await lab.boundingBox(),b=await theme.boundingBox();
   assert(a&&b,'Faltan accesos Laboratorio H o Claro');
   assert(Math.abs((a.y+a.height/2)-(b.y+b.height/2))<8,'Los botones no comparten renglón');
   assert(a.x+a.width<=b.x+4,'Los botones se superponen');
   assert(await page.locator('a[href="concordancia-folios.html"]').count()>0,'La nueva concordancia no está enlazada');
   await page.close();
 });
 await test('Onomasticon: selector multilingüe y contraste claro/oscuro',async()=>{
   const page=await pageFor('onomasticon.html');
   await page.waitForFunction(()=>document.querySelector('#ov-count-person')?.textContent==='32',{timeout:15000});
   await page.locator('#ov-language').selectOption('en');
   await page.waitForFunction(()=>document.querySelector('[data-i18n="alphabetical"]')?.textContent==='Alphabetical index',{timeout:12000});
   assert.match(await page.locator('#ov-detail').innerText(),/English V297|Spanish|Original historical profile/i);
   await page.locator('#ov-color').click();
   assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
   const col=await page.locator('.ov-numbers article').first().evaluate(e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor}));
   assert.notEqual(col.fg,col.bg,'Panel ilegible en modo oscuro');
   await page.close();
 });
 await test('Visores H S G C B: barras sutiles para compartir el folio actual',async()=>{
   for(const path of ['harleianus.html','sulpizio-1486.html','giocondo-1511.html','cesariano-1521.html','barbaro-1567.html','laboratorio-h.html']){
     const page=await pageFor(path);
     await page.locator('.vd-image-actions').waitFor({state:'visible',timeout:9000});
     assert.equal(await page.locator('.vd-image-actions button').count(),4,path+' no incluye cuatro acciones');
     assert.match(await page.locator('.vd-image-actions').innerText(),/Guardar imagen/);
     assert.match(await page.locator('.vd-image-actions').innerText(),/WhatsApp/);
     await page.close();
   }
 });
}finally{await browser?.close();server.kill()}
if(failures.length){console.error('\nAUDITORIA CON FALLOS\n'+failures.join('\n'));process.exitCode=1}else console.log('\nAuditoría básica de navegador completada sin fallos.');
