import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/vitruvia-search.js',import.meta.url),'utf8');
const providers=source.slice(source.indexOf('async function googleBooks('),source.indexOf('/* Distinción académica:'));
const calls=[];
const context=vm.createContext({URLSearchParams,culturalWeight:()=>0,brief:s=>s,htmlText:s=>s,fetchJSON:async url=>{
 calls.push(new URL(url));
 if(url.includes('googleapis'))return {items:[{volumeInfo:{title:'Coffee history',infoLink:'https://books.google.com/example'}}]};
 if(url.includes('/objects/'))return {title:'Coffee pot',objectURL:'https://www.metmuseum.org/art/collection/search/1'};
 return {objectIDs:[1]};
}});
vm.runInContext(providers+';globalThis.providers={googleBooks,museum}',context);
for(const query of ['cafetera','Marco Aurelio','κόσμος','café & arte']){
 calls.length=0;
 const books=await context.providers.googleBooks(query);
 const objects=await context.providers.museum(query);
 assert.equal(books.length,1);assert.equal(objects.length,1);
 assert.equal(calls[0].searchParams.get('q'),query);
 assert.equal(calls[1].searchParams.get('q'),query);
 assert.equal(calls[1].pathname,'/public/collection/v1/search');
 assert.equal(calls[1].searchParams.get('hasImages'),'true');
}
console.log('External search regression checks passed: Google Books, The Met, multilingual queries and URL encoding.');
