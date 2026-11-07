import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/vitruvia-article.js',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function choose('),source.indexOf('function wikiSummary('))+';globalThis.choose=choose',context);
const recipe={type:'passage',title:'Receta de cocina',exactTextMatch:true,workId:'cookbook',rating:9000};
const emperor={type:'wikipedia',title:'Augusto',entityCanonical:'Augusto',excerpt:'Emperador romano',preferredWiki:true};
assert.equal(context.choose([recipe,emperor],'augusto').title,'Augusto');
const selection=source.slice(source.indexOf(' const quotation='),source.indexOf(' const documentaryQuery='));
for(const query of ['augusto','Augusto','Pitagoras','cafetera']){
 const fixture=vm.createContext({query,authority:null,topicPlan:{kind:'topic'},rows:[recipe]});
 assert.equal(vm.runInContext(selection+';identified',fixture),null);
}
const fixture=vm.createContext({query:'Una cita de varias palabras',authority:emperor,topicPlan:{kind:'person'},rows:[recipe]});
assert.equal(vm.runInContext(selection+';identified',fixture),null);
const quotation=vm.createContext({query:'Una cita de varias palabras',authority:null,topicPlan:{kind:'topic'},rows:[recipe]});
assert.equal(vm.runInContext(selection+';identified',quotation).workId,'cookbook');
console.log('Entity priority checks passed: Augusto stays the topic; single words cannot become quotations; explicit long quotations remain available.');

const resolverSource=readFileSync(new URL('../assets/vitruvia-entity-resolver.js',import.meta.url),'utf8');
const normCode=resolverSource.slice(resolverSource.indexOf('const norm='),resolverSource.indexOf('// Bounded spelling tolerance'));
const honorificCode=resolverSource.slice(resolverSource.indexOf('const honorificVariant='),resolverSource.indexOf('const mediaWiki='));
const names=vm.createContext({});
vm.runInContext(normCode+honorificCode+';globalThis.honorificVariant=honorificVariant',names);
assert.equal(names.honorificVariant('San Martín de Porres'),'martin de porres','Saint name must resolve to the underlying biography');
assert.equal(names.honorificVariant('San Martín'),null,'Ambiguous short surname must not be discarded');
assert.equal(names.honorificVariant('Santa Teresa de Jesús'),'teresa de jesus');
const rankingSource=readFileSync(new URL('../assets/vitruvia-search.js',import.meta.url),'utf8');
assert.match(rankingSource,/r\.entityKind==="person"&&r\.wikidataId\?220/,'Verified human must get precedence in Featured');
assert.match(rankingSource,/namedAfterPenalty/,'Named institutions must not automatically displace the original person');
assert.match(resolverSource,/value\?\.id==="Q5"/,'Wikidata P31=Q5 person classification is required');
console.log('Historical entity checks passed: San Martín, Martín de Porres and institutional namesakes.');
