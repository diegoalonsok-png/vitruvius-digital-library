import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=name=>readFileSync(new URL('../assets/'+name,import.meta.url),'utf8');
const statement=value=>({rank:'normal',mainsnak:{datavalue:{value}}});
const refs=(...ids)=>ids.map(id=>statement({id}));
const sites=count=>Object.fromEntries(Array.from({length:count},(_,i)=>['lang'+i+'wiki',{}]));
function runtime(source,fetch){
 const window={};vm.runInNewContext(source,{window,document:{documentElement:{lang:'es'}},fetch,URLSearchParams,URL,AbortController,setTimeout,clearTimeout});return window;
}

test('Madonna resolves to the singer, while historical aliases still beat obscure namesakes',async()=>{
 async function resolve(query,exactName,historicalAlias,exactCoverage){
  const modern={id:'Q100',labels:{es:{value:exactName}},aliases:{},sitelinks:{...sites(exactCoverage),eswiki:{site:'eswiki',title:exactName}},descriptions:{es:{value:'cantante'}}};
  const historical={id:'Q200',labels:{es:{value:'Figura histórica'}},aliases:{es:[{value:historicalAlias}]},sitelinks:{...sites(180),eswiki:{site:'eswiki',title:'Figura histórica'}},descriptions:{es:{value:'persona histórica'}}};
  const window=runtime(read('vitruvia-entity-resolver.js'),async input=>{
   const url=new URL(input),p=url.searchParams;let data;
   if(p.get('action')==='wbsearchentities')data={search:[{id:modern.id,label:exactName},{id:historical.id,label:'Figura histórica',match:{text:historicalAlias}}]};
   else if(p.get('props')==='claims')data={entities:{[p.get('ids')]:{claims:{P31:refs('Q5')}}}};
   else if(p.get('action')==='wbgetentities')data={entities:{Q100:modern,Q200:historical}};
   else data={query:{pages:{1:{pageid:1,title:p.get('titles'),extract:'Biografía',fullurl:'https://es.wikipedia.org/wiki/'+p.get('titles'),pageprops:{wikibase_item:p.get('titles')===exactName?'Q100':'Q200'}}}}};
   return {ok:true,json:async()=>data};
  });
  return window.VitruviaEntityResolver.resolve(query,'es');
 }
 assert.equal((await resolve('Madonna','Madonna','Madonna',140)).wikidataId,'Q100');
 assert.equal((await resolve('Virgen María','Virgen María','Virgen María',2)).wikidataId,'Q200');
 const window=runtime(read('vitruvia-entity-resolver.js'),()=>{});
 assert.equal(window.VitruviaEntityResolver.subject('álbumes de Madonna'),'Madonna');
});

test('creator catalogues accept actual HTTP Wikidata result URIs, remove duplicates and exclude people',async()=>{
 const creator={id:'Q1',claims:{P800:refs('Q10','Q11')}};
 const work=(id,title,year,coverage,extra={})=>({id,labels:{es:{value:title}},descriptions:{es:{value:'obra cultural'}},claims:{P577:[statement({time:'+'+year+'-01-01T00:00:00Z'})],...extra},sitelinks:sites(coverage)});
 const data={Q1:creator,Q10:work('Q10','Obra destacada',2001,3),Q11:work('Q11','Otra destacada',1990,20),Q12:work('Q12','Obra con muchos registros',1980,200),Q13:work('Q13','Una persona',1970,300,{P31:refs('Q5')})};
 const requests=[];
 const window=runtime(read('vitruvia-cultural-works.js'),async input=>{
  const url=new URL(input);requests.push(url);let payload;
  if(url.hostname==='query.wikidata.org')payload={results:{bindings:['Q12','Q10','Q13'].map(id=>({work:{value:'http://www.wikidata.org/entity/'+id},coverage:{value:'5'}}))}};
  else payload={entities:Object.fromEntries(url.searchParams.get('ids').split('|').map(id=>[id,data[id]]))};
  return {ok:true,json:async()=>payload};
 });
 const result=await window.VitruviaCulturalWorks.catalogue({wikidataId:'Q1'},'visual');
 // Orden por defecto: cronológico («por orden de aparición»), pedido explícito del editor.
 assert.deepEqual(Array.from(result.works,w=>w.id),['Q12','Q11','Q10']);
 assert.equal(result.works.find(w=>w.id==='Q11').notable,true);
 assert.equal(result.works.find(w=>w.id==='Q12').notable,false);
 assert.deepEqual(Array.from([...result.works].sort((a,b)=>window.VitruviaCulturalWorks.compare(a,b,'year')),w=>w.id),['Q12','Q11','Q10']);
 assert.match(requests.find(u=>u.hostname==='query.wikidata.org').searchParams.get('query'),/wdt:P170/);
 const before=requests.length;
 assert.equal((await window.VitruviaCulturalWorks.catalogue({wikidataId:'Q1; DROP'},'architect')).works.length,0);
 assert.equal(requests.length,before);
});

test('notable works remain available when the reverse catalogue fails',async()=>{
 const window=runtime(read('vitruvia-cultural-works.js'),async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')throw Error('offline');
  const payload=url.searchParams.get('ids')==='Q1'?{Q1:{id:'Q1',claims:{P800:refs('Q10')}}}:{Q10:{id:'Q10',labels:{es:{value:'Edificio'}},claims:{P84:refs('Q1'),P3311:[statement('A verified floor plan.png')]}}};
  return {ok:true,json:async()=>({entities:payload})};
 });
 const result=await window.VitruviaCulturalWorks.catalogue({wikidataId:'Q1'},'architect');
 assert.equal(result.works.length,1);assert.equal(result.works[0].building,true);assert.equal(result.partial,true);
 assert.equal(result.works[0].plan,'https://commons.wikimedia.org/wiki/Special:FilePath/A_verified_floor_plan.png');
});

test('culture classification uses the identified subject instead of incidental biography words',()=>{
 const window=runtime(read('vitruvia-web-dossier.js'),()=>{});
 const row=(title,desc,extra={})=>({type:'wikipedia',title,entityCanonical:title,entityDescription:desc,preferredWiki:true,wikidataId:'Q1',link:'https://es.wikipedia.org/wiki/Test',...extra});
 const kind=(name,description,extra)=>window.VitruviaWebDossier.topicType(name,[row(name,description,extra)]);
 assert.equal(kind('Madonna','cantante, compositora y actriz estadounidense').kind,'music');
 assert.equal(kind('Radiohead','grupo musical británico de rock').kind,'music');
 assert.equal(kind('Le Corbusier','arquitecto y urbanista').kind,'architect');
 assert.equal(kind('Santiago Calatrava','arquitecto, ingeniero y escultor español').kind,'architect');
 assert.equal(kind('Miguel Ángel','escultor, pintor y arquitecto italiano').kind,'visual');
 assert.equal(kind('Cicerón','filósofo y escritor romano').kind,'author');
 assert.equal(kind('Pablo Picasso','pintor y escultor español').kind,'visual');
 assert.equal(kind('Stanley Kubrick','director de cine estadounidense').kind,'cinema');
 assert.equal(kind('El nombre de la rosa','novela de Umberto Eco').kind,'literary-work');
 assert.equal(kind('Madonna (singer)','singer',{catalogName:'Madonna'}).name,'Madonna');
});

test('spelling tolerance covers omissions, substitutions and transpositions without admitting unrelated names',()=>{
 const source=read('vitruvia-entity-resolver.js').replace('window.VitruviaEntityResolver={subject:clean,resolve','window.VitruviaEntityResolver={subject:clean,nameSimilarity,resolve');
 const match=runtime(source,()=>{}).VitruviaEntityResolver.nameSimilarity;
 for(const [query,title] of [['Jorje Luis Borjes','Jorge Luis Borges'],['Le Corvusier','Le Corbusier'],['Madona','Madonna'],['Radiohed','Radiohead'],['Garbiel Garcia Marquez','Gabriel García Márquez'],['JorgeLuisBorges','Jorge Luis Borges']])assert.ok(match(query,title)>0,query);
 for(const [query,title] of [['Jorje Luis Borjes','Juan Manuel Rodríguez Tobal'],['Radiohed','Radio station'],['Le Corvusier','Jean Leclerc'],['zzqv rrtplk','Jorge Luis Borges']])assert.equal(match(query,title),0,query);
});

test('Wikipedia spelling suggestions recover Borges and an unrelated first result is rejected',async()=>{
 const requestQueries=[];
 const window=runtime(read('vitruvia-entity-resolver.js'),async input=>{
  const p=new URL(input).searchParams;let data;
  if(p.get('action')==='wbsearchentities')data={search:[]};
  else if(p.get('action')==='wbgetentities')data={entities:{Q1:{id:'Q1',labels:{en:{value:'Jorge Luis Borges'}},descriptions:{es:{value:'escritor argentino'}},claims:{P31:refs('Q5')}}}};
  else if(p.get('list')==='search'){
   const query=p.get('srsearch');requestQueries.push(query);
   data={query:{search:[{title:'Juan Manuel Rodríguez Tobal'},...(query==='Jorge Luis Borges'?[{title:'Jorge Luis Borges'}]:[])],searchinfo:query==='Jorje Luis Borjes'?{suggestion:'Jorge Luis Borges'}:{}}};
  }else if(p.get('titles')==='Jorge Luis Borges')data={query:{pages:{1:{pageid:1,title:'Jorge Luis Borges',extract:'escritor argentino',pageprops:{wikibase_item:'Q1'}}}}};
  else data={query:{pages:{'-1':{title:p.get('titles'),missing:''}}}};
  return {ok:true,json:async()=>data};
 });
 const result=await window.VitruviaEntityResolver.resolve('Jorje Luis Borjes','es');
 assert.equal(result.canonical,'Jorge Luis Borges');assert.equal(result.spellingMatch,'Jorje Luis Borjes');assert.equal(result.kind,'person');
 // El resolvedor también sondea subfrases del nombre; lo exigible es empezar por la consulta original y usar la sugerencia.
 assert.equal(requestQueries[0],'Jorje Luis Borjes'); // La autoridad verificada puede resolver sin una segunda consulta innecesaria.
 assert.equal(await window.VitruviaEntityResolver.resolve('zzqv rrtplk','es'),null);
});

test('a late-loading cultural panel replays the active search and ignores results from an older query',()=>{
 class Node{
  constructor(){this.children=[];this.hidden=true;this.scrollTop=0}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes]}
  setAttribute(){}
  addEventListener(){}
  remove(){}
 }
 const panel=new Node(),input={value:'Radiohed'},events=new Map(),calls=[];
 const rows=[{type:'wikipedia',title:'Radiohead',link:'https://en.wikipedia.org/wiki/Radiohead',preferredWiki:true}];
 const window={VitruviaSearchSnapshot:{query:'Radiohed',rows},addEventListener:(name,fn)=>events.set(name,fn),VitruviaWebDossier:{render:(_panel,query,records)=>calls.push({query,records})}};
 vm.runInNewContext(read('vitruvia-context-panel.js'),{window,document:{documentElement:{lang:'es'},getElementById:id=>id==='vitruvia-context'?panel:id==='query'?input:null,createElement:()=>new Node(),createTextNode:text=>text},URLSearchParams,MutationObserver:class{observe(){}},requestAnimationFrame:fn=>fn()});
 assert.equal(panel.hidden,false);assert.equal(calls[0].query,'Radiohed');assert.equal(calls[0].records[0].title,'Radiohead');
 input.value='Madonna';events.get('vitruvia:search')({detail:{query:'Madonna'}});
 const count=calls.length;events.get('vitruvia:results')({detail:{query:'Radiohed',rows}});
 assert.equal(calls.length,count,'stale results must not overwrite the new artist');
 input.value='';events.get('vitruvia:clear')();assert.equal(panel.hidden,true);
 events.get('vitruvia:results')({detail:{query:'Madonna',rows}});assert.equal(panel.hidden,true);
 const html=readFileSync(new URL('../vitruvia.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('src="assets/vitruvia-context-panel.js')<html.indexOf('src="assets/vitruvia-search.js'));
});

test('an early sparse batch cannot turn Radiohed into a dictionary word while the band is resolving',async()=>{
 const events=new Map(),input={value:'Radiohed'};let submitted=0,dictionaryCalls=0;
 const window={addEventListener:(name,fn)=>events.set(name,fn),VitruviaEntityResolver:{resolve:async()=>({canonical:'Radiohead',wikidataId:'Q44190'})},VitruviaUnderstand:{localCorrect:()=>{dictionaryCalls++;return 'Radio'},generalCorrect:async()=>null,fold:s=>s.toLowerCase()}};
 vm.runInNewContext(read('vitruvia-entity-card.js'),{window,document:{documentElement:{lang:'es'},getElementById:id=>id==='query'?input:id==='search-form'?{requestSubmit:()=>submitted++}:null,addEventListener(){}},setTimeout:fn=>{fn()},clearTimeout(){}});
 await events.get('vitruvia:results')({detail:{query:'Radiohed',rows:[]}});
 assert.equal(input.value,'Radiohed');assert.equal(submitted,0);assert.equal(dictionaryCalls,0);
});

test('an architect cannot be replaced by an unrelated building named after that architect',()=>{
 const window=runtime(read('vitruvia-architecture-panel.js'),()=>{});
 const person={type:'wikipedia',title:'Andrea Palladio',entityKind:'person',preferredWiki:true,entityDescription:'arquitecto italiano',link:'https://es.wikipedia.org/wiki/Andrea_Palladio'};
 const station={type:'wikipedia',title:'Andrea Palladio power station',entityDescription:'coal-fired power station',link:'https://en.wikipedia.org/wiki/Andrea_Palladio_power_station'};
 assert.equal(window.VitruviaArchitecture.classify('Andrea Palladio',[station,person]).kind,'person');
 assert.equal(window.VitruviaArchitecture.classify('Andrea Palladio',[station,person]).subject,'Andrea Palladio');
});
