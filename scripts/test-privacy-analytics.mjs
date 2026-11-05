import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const config=load('assets/analytics-config.js');
const code=load('assets/analytics.js');
new vm.Script(code);
assert.match(config,/websiteId:""/,'Analytics must remain inactive until real site ID configured');
assert.match(code,/production=host==="diegoalonsok-png.github.io"/);
assert.match(code,/data-exclude-search/);
assert.match(code,/data-exclude-hash/);
assert.match(code,/data-do-not-track/);
assert.doesNotMatch(code,/detail\.query|query\.value|searchTerm|localStorage|sendBeacon/);
for(const page of ['index.html','vitruvia.html','bibliotheca-graeca-latina.html']){
 const html=load(page);
 assert.ok(html.includes('assets/analytics-config.js'),page+' missing analytics config');
 assert.ok(html.includes('assets/analytics.js'),page+' missing analytics loader');
 assert.ok(html.indexOf('assets/analytics-config.js')<html.indexOf('assets/analytics.js'),page+' bad load order');
}
let appended=0;
const mock={
 window:{VitruviusAnalyticsConfig:{websiteId:''}},
 location:{hostname:'diegoalonsok-png.github.io',pathname:'/vitruvia.html'},
 document:{head:{append(){appended++}}},
};
vm.runInNewContext(code,mock);
assert.equal(appended,0,'Unconfigured analytics must not load external script');
console.log('Optional analytics installation and privacy baseline passed.');
