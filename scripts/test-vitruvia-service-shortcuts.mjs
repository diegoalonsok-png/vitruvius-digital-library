// Security guardrail: visitor-only generic service shortcuts.
// Never attach an author's account, product, search, login or tracking data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../vitruvia.html',import.meta.url),'utf8');
const match=html.match(/<nav class="vitruvia-service-shortcuts"[\s\S]*?<\/nav>/);
assert(match,'Missing service shortcuts navigation');
const nav=match[0];
const expected=new Map([
 ['Yahoo Mail','mail.yahoo.com'],
 ['Gmail','mail.google.com'],
 ['Mercado Libre','www.mercadolibre.com.ar'],
 ['Mercado Pago','www.mercadopago.com.ar'],
 ['Banco Ciudad','www.bancociudad.com.ar'],
 ['PayPal','www.paypal.com'],
 ['Facebook','www.facebook.com'],
 ['WhatsApp','web.whatsapp.com'],
 ['N26','n26.com'],
 ['X','x.com']
]);
const links=[...nav.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)];
assert.equal(links.length,expected.size,'Unexpected shortcut count');
for(const [,attributes,labelRaw] of links){
 const label=labelRaw.trim();
 assert(expected.has(label),'Unrecognized shortcut: '+label);
 const href=attributes.match(/\bhref="([^"]+)"/)?.[1];
 assert(href,'Shortcut missing URL: '+label);
 const u=new URL(href);
 assert.equal(u.protocol,'https:','Shortcuts require HTTPS');
 assert.equal(u.hostname,expected.get(label),'Forbidden account, product or lookalike domain for '+label);
 assert.equal(u.username,'','URL contains account username');
 assert.equal(u.password,'','URL contains a password');
 assert.equal(u.pathname,'/','Shortcut should open only the public service homepage');
 assert.equal(u.search,'','URL contains account, query, redirect, referral or tracking data');
 assert.equal(u.hash,'','URL has private fragment');
 assert.match(attributes,/\btarget="_blank"/,'Service must open in its own tab');
 assert.match(attributes,/\brel="[^"]*\bnoopener\b[^"]*"/,'Missing noopener');
 assert.match(attributes,/\brel="[^"]*\bnoreferrer\b[^"]*"/,'Missing noreferrer');
 assert.doesNotMatch(attributes,/\b(?:onclick|data-(?:query|account|user|token|session))=/i,'Unexpected inline behavior or personal data');
 expected.delete(label);
}
assert.equal(expected.size,0,'Not all shortcuts checked');
assert.doesNotMatch(nav,/<(?:form|input|script)\b/i,'No credential forms or scripts allowed');
console.log('PASS: 10 safe generic URLs, no personal accounts, products, keys, queries or referrer leakage');
