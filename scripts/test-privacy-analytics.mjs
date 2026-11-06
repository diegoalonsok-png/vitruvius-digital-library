import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const load=path=>readFileSync(new URL(path,root),'utf8');
const config=load('assets/analytics-config.js');
const code=load('assets/analytics.js');
new vm.Script(config);
new vm.Script(code);
const configured={window:{}};
vm.runInNewContext(config,configured);
assert.match(configured.window.VitruviusAnalyticsConfig.ga4MeasurementId,/^G-[A-Z0-9]{6,}$/);
assert.equal(configured.window.VitruviusAnalyticsConfig.ga4PropertyId,'562906375');
assert.equal(configured.window.VitruviusAnalyticsConfig.reportTimeZone,'America/Argentina/Buenos_Aires');

const htmlPaths=[];
for(const dir of ['','corpus','documents','escritorio-h']){
 for(const entry of readdirSync(new URL(dir||'.',root),{withFileTypes:true})){
  if(entry.isFile()&&entry.name.endsWith('.html')&&!/^google.*\.html$/.test(entry.name)&&entry.name!=='offline.html'){
   htmlPaths.push(join(dir,entry.name));
  }
 }
}
for(const path of htmlPaths){
 const html=load(path);
 const tags=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']*analytics(?:-config)?\.js[^"']*)["'][^>]*>/g)];
 assert.equal(tags.filter(t=>t[1].includes('analytics-config.js')).length,1,path+' needs one analytics config');
 assert.equal(tags.filter(t=>/analytics\.js/.test(t[1])).length,1,path+' needs one analytics loader');
 assert(tags[0][1].includes('analytics-config.js'),path+' bad script order');
 for(const tag of tags)assert(/\bdefer\b/.test(tag[0]),path+' analytics must be deferred');
}

function run({measurementId='G-TN23SX9Z69',host='diegoalonsok-png.github.io',path='/vitruvius-digital-library/vitruvia.html',dnt='0',gpc=false,embedded=false}={}){
 const appended=[];
 const window={VitruviusAnalyticsConfig:{ga4MeasurementId:measurementId,websiteId:''},navigator:{doNotTrack:dnt,globalPrivacyControl:gpc}};
 window.self=window;window.top=embedded?{}:window;
 const context={
  window,URL,
  location:{hostname:host,pathname:path,origin:'https://'+host,href:'https://'+host+path+'?query=SECRET_QUERY#SECRET_HASH'},
  document:{referrer:'https://example.org/private?query=SECRET_REF',createElement(){return{}},head:{append(s){appended.push(s)}}}
 };
 vm.runInNewContext(code,context);
 return{context,window,appended};
}
for(const options of [
 {measurementId:''},{measurementId:'GTM-INVALID'},{host:'localhost'},{host:'preview.example.org'},
 {path:'/other-project/index.html'},{dnt:'1'},{gpc:true},{embedded:true}
]){
 const r=run(options);
 assert.equal(r.appended.length,0,'Analytics should stay inactive: '+JSON.stringify(options));
}
const live=run();
assert.equal(live.appended.length,1);
assert.equal(live.appended[0].src,'https://www.googletagmanager.com/gtag/js?id=G-TN23SX9Z69');
const commands=live.window.dataLayer.map(entry=>Array.from(entry));
assert.equal(commands.filter(c=>c[0]==='config').length,1,'Exactly one automatic pageview configuration');
const settings=commands.find(c=>c[0]==='config')[2];
assert.equal(settings.page_location,'https://diegoalonsok-png.github.io/vitruvius-digital-library/vitruvia.html');
assert.equal(settings.page_referrer,'https://example.org/');
assert.equal(settings.allow_google_signals,false);
assert.equal(settings.allow_ad_personalization_signals,false);
assert.equal(settings.cookie_path,'/vitruvius-digital-library/');
assert.doesNotMatch(JSON.stringify(commands),/SECRET_QUERY|SECRET_HASH|SECRET_REF/,'Search terms or URL secrets leaked');
vm.runInNewContext(code,live.context);
assert.equal(live.appended.length,1,'Duplicate loader must not duplicate scripts or pageviews');
assert.equal(live.window.dataLayer.filter(c=>c[0]==='config').length,1);
console.log('GA4 visitor measurement, privacy and coverage passed: '+htmlPaths.length+' pages.');
