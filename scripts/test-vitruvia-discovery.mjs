/* Query intent, contextual history, image order and complete extract regression.
 * Run: node --test scripts/test-vitruvia-discovery.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const window={};runInNewContext(source('assets/vitruvia-discovery.js'),{window});
const D=window.VitruviaDiscovery;
const pythagoras=D.plan('Pitagoras',{canonical:'Pitágoras',kind:'person',commonsSearchName:'Pythagoras',aliases:['Pythagoras of Samos'],birthYear:-570});
const page=(title,description='',extra={})=>({title:'File:'+title,imageinfo:[{thumburl:'https://upload.wikimedia.org/example.jpg',url:'https://upload.wikimedia.org/original.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(title),mime:'image/jpeg',extmetadata:{ImageDescription:{value:description},LicenseShortName:{value:'CC BY-SA 4.0'},Artist:{value:'<a href="/">Photographer</a>'}}}],...extra});

test('a person is identified by entity metadata without a list of famous names',()=>{
 assert.equal(pythagoras.kind,'person');assert.equal(pythagoras.ancient,true);
 assert.equal(D.plan('Ada Lovelace',{canonical:'Ada Lovelace',instanceOf:['Q5']}).kind,'person');
 assert.equal(D.plan('Objeto desconocido',{description:'utensilio de cocina de metal'}).kind,'object');
});
test('Pythagoras queries use the Commons name and deliberately seek busts, portraits and books',()=>{
 const queries=Array.from(pythagoras.queries).join(' ');
 assert.match(queries,/Pythagoras bust/);assert.match(queries,/Pythagoras portrait painting/);assert.match(queries,/Pythagoras book manuscript/);
});
test('busts and portraits outrank diagrams even if diagrams have a higher lexical score',()=>{
 const fixtures=[page('Pythagoras theorem diagram.jpg','',{fromTrustedCategory:true}),page('Bust of Pythagoras, marble.jpg'),page('Pythagoras portrait engraving.jpg'),page('Pythagoras book frontispiece.jpg')];
 const items=fixtures.map(p=>({...D.imageRank(p,pythagoras),name:p.title}));
 assert.deepEqual(Array.from(D.sortImages(items,pythagoras),x=>x.group),['sculpture','portrait','book','context']);
});
test('partial common names cannot admit a different person',()=>{
 const marcus=D.plan('Marco Aurelio',{canonical:'Marco Aurelio',kind:'person',aliases:['Marcus Aurelius']});
 assert.equal(D.imageRank(page('Marco Pérez musician portrait.jpg'),marcus).accepted,false);
 assert.equal(D.imageRank(page('Bust of Marcus Aurelius.jpg'),marcus).accepted,true);
});
test('an authority image can be included when its filename does not contain the name',()=>{
 const image=page('Capitoline marble head 1999.jpg','',{fromEntityImage:true});
 assert.equal(D.imageRank(image,pythagoras).accepted,true);assert.equal(D.imageRank(image,pythagoras).group,'sculpture');
});
test('explicit artwork or book requests retain the requested visual intent',()=>{
 const artworks=D.plan('pinturas de Leonardo da Vinci',{canonical:'Leonardo da Vinci',kind:'person'});
 assert.equal(artworks.intent,'artworks');assert.equal(D.groupOrder(artworks)[0],'artwork');
 const books=D.plan('libros de Cicerón',{canonical:'Cicerón',kind:'person'});
 assert.equal(D.groupOrder(books)[0],'book');
});
test('the leading strip is diverse and still puts sculpture before portraits and books',()=>{
 const items=['sculpture','sculpture','sculpture','portrait','portrait','book','context'].map((group,i)=>({group,name:String(i),page:String(i),score:100-i}));
 const strip=D.previewImages(items,pythagoras);
 assert.equal(strip.length,5);assert.deepEqual(Array.from(strip,x=>x.group),['sculpture','sculpture','portrait','portrait','book']);
});
for(const q of ['cafetera','cafeteras','coffee maker','cafetiere'])test('object and coffee history remain distinct for '+q,()=>{
 const topic=D.plan(q);assert.equal(topic.kind,'object');assert.equal(topic.family,'coffee');
 assert.ok(Array.from(topic.contextTitles.es).includes('Historia del café'));assert.equal(topic.subject,q);
});
for(const q of ['sarten','sartén','sartenes','frying pan','poêle'])test('cookware history is selected for '+q,()=>{
 const topic=D.plan(q);assert.equal(topic.kind,'object');assert.equal(topic.family,'cookware');
 assert.ok(Array.from(topic.contextTitles.es).includes('Historia de la gastronomía'));
});
test('objects start with the object and historic examples, not portraits of people',()=>{
 const topic=D.plan('cafetera');
 assert.equal(D.imageRank(page('Cafetera italiana.jpg'),topic).group,'object');
 assert.equal(D.imageRank(page('Cafetera antigua museum collection.jpg'),topic).group,'historic');
 assert.deepEqual(Array.from(D.groupOrder(topic)).slice(0,3),['object','historic','book']);
});
test('article parsing preserves long sections, every paragraph and the final section',()=>{
 const long='Texto íntegro '.repeat(500),body=Array.from({length:100},(_,i)=>'Párrafo '+i+' '+long).join('\n\n');
 const raw='Introducción\n\n== Historia ==\n\n'+body+'\n\n=== Recepción final ===\n\nCONTENIDO_FINAL';
 const blocks=D.parseExtract(raw);
 assert.equal(blocks.filter(b=>b.type==='paragraph').length,102);
 assert.equal(blocks.at(-1).text,'CONTENIDO_FINAL');
 assert.equal(blocks.find(b=>b.text==='Recepción final').level,3);
 assert.equal(blocks.find(b=>b.text.startsWith('Párrafo 99')).text.length,('Párrafo 99 '+long).trim().length);
});
test('the article renderer also retains text beyond its former 75-paragraph cutoff',()=>{
 const code=source('assets/vitruvia-article.js');
 const fn=code.slice(code.indexOf('function appendBiographyExtract('),code.indexOf('const objectContextCache='));
 const output=[];
 const render=new Function('window','make','$','paragraph',fn+';return appendBiographyExtract;')(
  {VitruviaDiscovery:D},(tag,text)=>({tag,text}),()=>({append:x=>output.push(x)}),text=>output.push({tag:'p',text}));
 const text=Array.from({length:90},(_,i)=>'Texto '+i).join('\n\n');
 assert.equal(render(text),90);assert.equal(output.at(-1).text,'Texto 89');
});
test('image records retain attribution, remove markup and reject unsafe image URLs',()=>{
 const engine=source('assets/vitruvia-image-engine-v2.js');
 const fn=engine.slice(engine.indexOf('function collectedImages('),engine.indexOf('function displayGroups('));
 const safeLink=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:null}catch{return null}};
 const collect=new Function('window','safeLink','matchingScore',fn+';return collectedImages;')({VitruviaDiscovery:D},safeLink,()=>0);
 const bust=page('Pythagoras bust.jpg'),unsafe=page('Pythagoras portrait.jpg');unsafe.imageinfo[0].thumburl='javascript:alert(1)';
 bust.imageinfo[0].extmetadata.ObjectName={value:'Name title QS:P1476 label QS:Len'};
 const result=collect([bust,{...bust,fromEntityImage:true},unsafe],pythagoras);
 assert.equal(result.length,1);assert.equal(result[0].license,'CC BY-SA 4.0');
 assert.match(result[0].credit,/Photographer/);assert.doesNotMatch(result[0].credit,/<a/);
 assert.doesNotMatch(result[0].caption,/QS:/);
 assert.ok(result[0].score>=160);
});
test('object history requests obey provider limits and retain both related sources',async()=>{
 const code=source('assets/vitruvia-article.js');
 const fn=code.slice(code.indexOf('const objectContextCache='),code.indexOf('/* External material is attributed;'));
 const requests=[],headings=[];
 const fetch=async url=>{
  const u=new URL(url),title=u.searchParams.get('titles');requests.push(u);
  assert.ok(title&&!title.includes('|'));assert.equal(u.searchParams.has('exchars'),false);
  return {ok:true,json:async()=>({query:{pages:{1:{title,extract:'Texto histórico documentado.',fullurl:'https://es.wikipedia.org/wiki/'+encodeURIComponent(title)}}}})};
 };
 const append=new Function('window','document','fetch','AbortController','setTimeout','clearTimeout','URLSearchParams','heading','paragraph','make','href','$','phrase','let active=1;'+fn+';return appendObjectContext;')(
  {VitruviaDiscovery:D},{documentElement:{lang:'es'}},fetch,AbortController,setTimeout,clearTimeout,URLSearchParams,x=>headings.push(x),()=>{},()=>({append(){}}),()=>null,()=>({append(){}}),x=>x);
 const result=await append(D.plan('cafetera'),1);
 assert.equal(result.length,2);assert.equal(requests.length,2);
 assert.ok(headings.includes('Contexto relacionado: Historia del café'));
 await append(D.plan('cafetera'),1);assert.equal(requests.length,2,'Repeat renders must reuse fetched context');
});
test('an identified object collection excludes a namesake from generic image search',()=>{
 const engine=source('assets/vitruvia-image-engine-v2.js');
 const fn=engine.slice(engine.indexOf('function collectedImages('),engine.indexOf('function displayGroups('));
 const collect=new Function('window','safeLink','matchingScore',fn+';return collectedImages;')({VitruviaDiscovery:D},x=>x.startsWith('https:')?x:null,()=>0);
 const fixtures=Array.from({length:9},(_,i)=>page('Frying pan museum '+i+'.jpg','',{fromTrustedCategory:true}));
 fixtures.push(page('Frying Pan Chelsea ship.jpg'));
 const items=collect(fixtures,D.plan('sartén',{canonical:'Sartén',aliases:['Frying pan']}));
 assert.equal(items.length,9);assert.equal(items.some(x=>x.name.includes('Chelsea')),false);
});
test('the library forwards the exact query to Vitruvia without adding Vitruvius',()=>{
 const input={value:'sartén & café',listeners:{},addEventListener(k,f){this.listeners[k]=f}},link={addEventListener(){}};
 const document={documentElement:{lang:'es'},getElementById:id=>id==='query'?input:link};
 runInNewContext(source('assets/vitruvia-library-bridge.js'),{document,location:{href:'https://example.org/library/index.html'},URL,MutationObserver:class{observe(){}},setTimeout});
 const target=new URL(link.href);assert.equal(target.pathname,'/library/vitruvia.html');assert.equal(target.searchParams.get('q'),'sartén & café');
 input.value='';input.listeners.input();assert.equal(new URL(link.href).search,'');
});
test('new assets are wired before their consumers and original manuscript/dictation entry points survive',()=>{
 const html=source('vitruvia.html');assert.ok(html.indexOf('src="assets/vitruvia-discovery.js')<html.indexOf('src="assets/vitruvia-image-engine-v2.js'));
 assert.match(html,/id="article-image-preview"/);assert.match(html,/assets\/vitruvia-dictation.js/);assert.match(html,/assets\/vitruvia-local-manuscripts.js/);
 const index=source('index.html');assert.match(index,/id="search-in-vitruvia"/);assert.match(index,/assets\/vitruvia-library-bridge.js/);
 for(const file of ['assets/vitruvia-discovery.js','assets/vitruvia-image-engine-v2.js','assets/vitruvia-entity-resolver.js','assets/vitruvia-article.js','assets/vitruvia-search.js','assets/vitruvia-library-bridge.js'])new Script(source(file),{filename:file});
});

test('coins and prints cannot inherit the sculpture group from a category',()=>{
 const nero=D.plan('Nerón',{canonical:'Nerón',kind:'person',commonsSearchName:'Nero'});
 assert.equal(D.imageRank(page('Nero aureus coin.jpg','',{sourceCategory:'Category:Busts of Nero',fromTrustedCategory:true}),nero).group,'context');
 assert.equal(D.imageRank(page('Nero bust engraving.jpg','',{sourceCategory:'Category:Busts of Nero',fromTrustedCategory:true}),nero).group,'portrait');
 assert.equal(D.imageRank(page('Marble bust of Nero.jpg'),nero).group,'sculpture');
});
test('museum records outrank equivalent unprovenanced photographs and masked variants',()=>{
 const topic=D.plan('Vitruvio',{canonical:'Vitruvio',kind:'person',commonsSearchName:'Vitruvius'});
 const plain=D.imageRank(page('Vitruvius bust.jpg'),topic);
 const museum=D.imageRank(page('Vitruvius bust museum.jpg'),topic);
 const mask=D.imageRank(page('Vitruvius bust with surgical mask.jpg'),topic);
 assert(museum.score>plain.score);assert(mask.score<plain.score);
});


test('Quijote bibliography is typeset as separate records without losing or inventing words',()=>{
 const citation='Aguirre Bellver, Joaquín (2005). El borrador de Cervantes. ISBN 84-321-2919-4. Anso, Carlos (2001). Don Quijote o el sueño de Cervantes. Pamplona: Pamiela. Ascunce Arrieta, José Ángel (1997). Los quijotes del Quijote. — (2005). El Quijote como tragedia. Bonilla y San Martín, Adolfo (1926). Beltrán, Francisco, ed. Cervantes y su obra. Madrid.';
 const blocks=D.parseExtract('== Referencias ==\n\n=== Bibliografía ===\n\n'+citation+'\n\n== Enlaces externos ==\n\nVolver a la obra.');
 const list=blocks.filter(b=>b.type==='bibliography-item');
 assert.equal(list.length,6);
 assert.equal(list.map(b=>b.text).join(' '),citation);
 assert.equal(blocks.at(-1).type,'paragraph');
 assert.equal(blocks.at(-1).text,'Volver a la obra.');
});
test('long encyclopedia sections read as paragraphs; bibliography uses a hanging-indent list',()=>{
 const code=source('assets/vitruvia-article.js');
 const fn=code.slice(code.indexOf('function appendBiographyExtract('),code.indexOf('const objectContextCache='));
 const rendered=[];
 const make=(tag,text,cls)=>({tag,text,cls,children:[],append(item){this.children.push(item)}});
 const append=new Function('window','make','$','paragraph',fn+';return appendBiographyExtract;')(
  {VitruviaDiscovery:D},make,()=>({append:item=>rendered.push(item)}),(text,cls)=>rendered.push({tag:'p',text,cls}));
 const phrase='La tradición manuscrita del Quijote requiere estudiar ediciones, impresores y el contexto de cada testimonio. ';
 const prose=phrase.repeat(17).trim();
 const citation='Aguirre Bellver, Joaquín (2005). El borrador de Cervantes. Anso, Carlos (2001). Don Quijote o el sueño de Cervantes.';
 append('== Ediciones en castellano ==\n\n'+prose+'\n\n== Bibliografía ==\n\n'+citation);
 const paragraphs=rendered.filter(x=>x.tag==='p'),lists=rendered.filter(x=>x.tag==='ul');
 assert.ok(paragraphs.length>=2);
 assert.equal(paragraphs.map(p=>p.text).join(' '),prose);
 assert.equal(lists.length,1);
 assert.equal(lists[0].cls,'article-bibliography-list');
 assert.deepEqual(lists[0].children.map(x=>x.text).join(' '),citation);
 assert.equal(lists[0].children.length,2);
});
