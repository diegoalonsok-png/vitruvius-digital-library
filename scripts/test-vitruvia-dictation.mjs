/* Behavioral checks for microphone sessions; no microphone or network required.
 * Run: node --test scripts/test-vitruvia-dictation.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext, Script} from 'node:vm';

const code=readFileSync(new URL('../assets/vitruvia-dictation.js',import.meta.url),'utf8');
class Target{
 constructor(){this.listeners=new Map()}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn)}
 dispatchEvent(event){event.target??=this;for(const fn of this.listeners.get(event.type)||[])fn(event);return true}
 emit(type,props={}){this.dispatchEvent({type,...props})}
}
class Element extends Target{
 constructor(id=''){super();this.id=id;this.dataset={};this.attributes={};this.classList={add(){}};this.value='';this.maxLength=180;this.textContent='';this.innerHTML='';this.disabled=false}
 setAttribute(key,value){this.attributes[key]=value}
 getAttribute(key){return this.attributes[key]??null}
 closest(selector){return selector.split(',').some(s=>s.trim()==='#'+this.id)?this:null}
}
function setup({supported=true,secure=true,prefixed=false,lang='es',startError,stopError,constructorError}={}){
 const instances=[],timers=new Map();let nextTimer=0;
 const window=new Target(),document=new Target();
 window.isSecureContext=secure;document.documentElement={lang};document.hidden=false;
 const button=new Element(),input=new Element('query'),status=new Element(),language=new Element('ui-language'),form=new Element('search-form');
 input.form=form;language.value=lang;document.getElementById=id=>id==='ui-language'?language:null;
 class Recognition{
  constructor(){if(constructorError)throw constructorError;this.starts=0;this.stops=0;this.aborts=0;instances.push(this)}
  start(){this.starts++;if(startError)throw startError}
  stop(){this.stops++;if(stopError)throw stopError}
  abort(){this.aborts++}
  emit(type,props={}){this['on'+type]?.(props)}
 }
 if(supported)window[prefixed?'webkitSpeechRecognition':'SpeechRecognition']=Recognition;
 const setTimeout=(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id};
 const clearTimeout=id=>timers.delete(id);
 class Event{constructor(type,options={}){this.type=type;this.bubbles=options.bubbles}}
 runInNewContext(code,{window,document,Event,setTimeout,clearTimeout});
 const attach=()=>window.VitruviaDictation.attach({button,input,status});attach();
 const click=()=>button.emit('click');
 const begin=()=>{click();const r=instances.at(-1);r.emit('start');return r};
 const result=(r,...words)=>r.emit('result',{results:words.map(transcript=>[{transcript}])});
 const expire=ms=>{for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn()}};
 return{window,document,button,input,status,language,form,instances,timers,attach,click,begin,result,expire};
}

test('shows listening only after the browser starts and configures a single query',()=>{
 const h=setup();h.click();const r=h.instances[0];
 assert.equal(r.lang,'es-AR');assert.equal(r.continuous,false);assert.equal(r.interimResults,true);
 assert.equal(h.button.dataset.state,'starting');assert.equal(h.button.getAttribute('aria-pressed'),'false');
 r.emit('start');assert.equal(h.button.dataset.state,'listening');assert.equal(h.button.getAttribute('aria-pressed'),'true');
 r.emit('end');assert.equal(h.button.dataset.state,'idle');assert.equal(h.timers.size,0);
});

test('interim revisions replace spoken text, preserve the existing query and notify search controls',()=>{
 const h=setup();h.input.value='historia';let inputs=0,submits=0;
 h.input.addEventListener('input',()=>inputs++);h.form.addEventListener('submit',()=>submits++);
 const r=h.begin();h.result(r,'del');h.result(r,'del café');h.result(r,'del café','en Roma');
 assert.equal(h.input.value,'historia del café en Roma');assert.equal(inputs,3);assert.equal(submits,0);
 r.emit('end');assert.match(h.status.textContent,/Revisa el texto y pulsa Buscar/);
});

test('stopping accepts the final words and ignores repeated stop clicks',()=>{
 const h=setup(),r=h.begin();h.result(r,'Vitru');h.click();h.click();
 assert.equal(r.stops,1);assert.equal(h.button.dataset.state,'stopping');
 h.result(r,'Vitruvio');r.emit('end');
 assert.equal(h.input.value,'Vitruvio');assert.equal(h.button.dataset.state,'idle');assert.equal(h.button.disabled,false);
});

test('speech end stops recognition and returns to an idle microphone',()=>{
 const h=setup(),r=h.begin();r.emit('speechend');assert.equal(r.stops,1);
 h.result(r,'Codex H');r.emit('end');assert.equal(h.button.getAttribute('aria-pressed'),'false');
});

test('cancelling pending permission ignores all late callbacks and allows another session',()=>{
 const h=setup();h.click();const old=h.instances[0];h.click();
 assert.equal(old.aborts,1);assert.equal(h.button.dataset.state,'idle');
 const current=h.begin();old.emit('start');h.result(old,'no debe aparecer');old.emit('end');
 assert.equal(h.button.dataset.state,'listening');assert.equal(h.input.value,'');
 h.result(current,'cafetera');assert.equal(h.input.value,'cafetera');
});

test('denied permissions show a useful message, reset the button and preserve the error after end',()=>{
 const h=setup();h.click();const r=h.instances[0];r.emit('error',{error:'not-allowed'});
 assert.equal(h.button.dataset.state,'idle');assert.match(h.status.textContent,/controles del sitio y del dispositivo/);
 assert.doesNotMatch(h.status.textContent,/not-allowed/);const message=h.status.textContent;
 r.emit('end');assert.equal(h.status.textContent,message);h.click();assert.equal(h.instances.length,2);
});

for(const [error,message] of [['audio-capture',/micrófono/],['network',/conexión/],['no-speech',/No se detectó voz/],['service-not-allowed',/servicio de dictado/],['language-not-supported',/idioma/]]){
 test('recovers from '+error,()=>{
  const h=setup(),r=h.begin();r.emit('error',{error});
  assert.match(h.status.textContent,message);assert.equal(h.button.dataset.state,'idle');assert.equal(h.timers.size,0);
 });
}

test('start, stop and constructor exceptions cannot leave a stuck button',()=>{
 const denied=setup({startError:Object.assign(new Error(),{name:'NotAllowedError'})});denied.click();
 assert.equal(denied.button.dataset.state,'idle');assert.match(denied.status.textContent,/no permitió/);assert.equal(denied.timers.size,0);
 const broken=setup({stopError:new Error()});const r=broken.begin();broken.click();
 assert.equal(r.aborts,1);assert.equal(broken.button.dataset.state,'idle');assert.equal(broken.timers.size,0);
 const constructor=setup({constructorError:new Error()});constructor.click();assert.equal(constructor.button.dataset.state,'idle');
});

for(const id of ['clear-search','clear-all','vitruvia-erase-session']){
 test(id+' cancels before clearing and late results cannot recreate the query',()=>{
  const h=setup(),r=h.begin();h.result(r,'consulta anterior');
  h.document.emit('click',{target:new Element(id)});h.input.value='';
  h.result(r,'consulta anterior con palabras tardías');r.emit('end');
  assert.equal(r.aborts,1);assert.equal(h.input.value,'');assert.equal(h.button.dataset.state,'idle');
 });
}

test('the search clear event also cancels recognition',()=>{
 const h=setup(),r=h.begin();h.input.value='';h.window.emit('vitruvia:clear');h.result(r,'tardío');
 assert.equal(h.input.value,'');assert.equal(r.aborts,1);
});

test('typing while listening keeps the manual edit instead of overwriting it',()=>{
 const h=setup(),r=h.begin();h.result(r,'Vitruvio');h.input.value='Cicerón';h.input.emit('input');
 h.result(r,'texto tardío');assert.equal(h.input.value,'Cicerón');assert.equal(r.aborts,1);
});

test('programmatic query changes are preserved even without an input event',()=>{
 const h=setup(),r=h.begin();h.input.value='consulta elegida';h.result(r,'otra consulta');
 assert.equal(h.input.value,'consulta elegida');assert.equal(r.aborts,1);
});

test('submitting stops the microphone without clearing the visible query',()=>{
 const h=setup(),r=h.begin();h.result(r,'cafetera');h.form.emit('submit');h.result(r,'palabras tardías');
 assert.equal(r.aborts,1);assert.equal(h.input.value,'cafetera');
});

test('spoken text obeys the query length limit',()=>{
 const h=setup();h.input.maxLength=12;const r=h.begin();h.result(r,'abcdefghijklmnop');
 assert.equal(h.input.value,'abcdefghijkl');assert.equal(r.aborts,1);assert.match(h.status.textContent,/límite/);
});

test('an empty recognition can be retried',()=>{
 const h=setup(),r=h.begin();r.emit('end');assert.match(h.status.textContent,/No se detectó voz/);
 h.click();assert.equal(h.instances.length,2);
});

test('unsupported and insecure browsers explain the fallback without disabling text input',()=>{
 for(const options of [{supported:false},{secure:false}]){
  const h=setup(options);assert.equal(h.button.disabled,true);assert.equal(h.input.disabled,false);
  assert.equal(h.button.dataset.state,'unavailable');assert.ok(h.status.textContent);
  h.click();assert.equal(h.instances.length,0);
 }
});

test('the prefixed browser API works and attaching twice does not duplicate listeners',()=>{
 const h=setup({prefixed:true});h.attach();h.click();assert.equal(h.instances.length,1);
});

for(const [lang,tag,label] of [['es','es-AR','Dictar'],['en','en-US','Dictate'],['fr','fr-FR','Dicter']]){
 test('uses the selected language: '+lang,()=>{
  const h=setup({lang});assert.match(h.button.innerHTML,new RegExp(label));const r=h.begin();assert.equal(r.lang,tag);
  h.language.value=lang==='en'?'fr':'en';h.language.emit('change');assert.equal(r.aborts,1);
  assert.match(h.status.textContent,lang==='en'?/langue choisie/:/selected language/);
 });
}

test('pending startup and stop timeouts reset recognition and ignore late results',()=>{
 const h=setup();h.click();const old=h.instances[0];h.expire(15000);
 assert.equal(h.button.dataset.state,'idle');assert.equal(old.aborts,1);
 old.emit('start');h.result(old,'late');assert.equal(h.input.value,'');
 const r=h.begin();h.click();h.expire(4000);assert.equal(h.button.dataset.state,'idle');assert.equal(r.aborts,1);
});

test('listening has a finite lifetime and stops after one minute',()=>{
 const h=setup(),r=h.begin();h.expire(60000);assert.equal(r.stops,1);assert.equal(h.button.dataset.state,'stopping');
});

test('hiding or leaving the page releases the microphone',()=>{
 const h=setup(),r=h.begin();h.document.hidden=true;h.document.emit('visibilitychange');assert.equal(r.aborts,1);
 h.document.hidden=false;const next=h.begin();h.window.emit('pagehide');assert.equal(next.aborts,1);
});

test('page wiring loads the controller once and removes the old recognition handlers',()=>{
 const html=readFileSync(new URL('../vitruvia.html',import.meta.url),'utf8');
 assert.equal((html.match(/src="assets\/vitruvia-dictation.js\?/g)||[]).length,1);
 assert.match(html,/VitruviaDictation\.attach\(\{button:voice,input,status\}\)/);
 assert.doesNotMatch(html,/recognition\.onresult|recognition\.continuous/);
 for(const [i,m] of [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].entries()){
  if(/type=["']application\/ld\+json["']/i.test(m[1]))JSON.parse(m[2]);
  else new Script(m[2],{filename:'inline '+i});
 }
});
