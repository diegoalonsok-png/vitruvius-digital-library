#!/usr/bin/env node
/** Read-only discovery gate for public classical-work landing pages.
 * This verifies crawler-readable metadata, not actual search-engine indexing.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const base='https://vitruvius-digital-library.org';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sitemap=read('sitemap.xml');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));
const set=new Set(urls);
assert.equal(set.size,urls.length,'Duplicated sitemap URL');
const robots=read('robots.txt');
assert(robots.includes('Sitemap: '+base+'/sitemap.xml'),'Sitemap not advertised by robots.txt');
assert(!/Disallow:\s*\/\s*$/m.test(robots),'Entire site blocked in robots.txt');
const files=fs.readdirSync(path.join(root,'obras')).filter(x=>/^[a-z0-9-]+\.html$/.test(x)).sort();
assert(files.length>0,'No public classical-work pages found');
const errors=[];
for(const file of files){
 const p='obras/'+file,html=read(p),url=base+'/'+p;
 if(!set.has(url))errors.push(p+': absent from sitemap');
 const canonical=[...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
 if(canonical.length!==1 || !canonical[0][0].includes('href="'+url+'"'))errors.push(p+': missing, duplicate or mismatched canonical');
 const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
 if(!title||title.length<12)errors.push(p+': missing title');
 if(!/<meta\s+name=["']description["']\s+content=["'][^"']{50,}/i.test(html))errors.push(p+': missing useful description');
 if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))errors.push(p+': noindex directive');
 if(!/<h1\b/i.test(html))errors.push(p+': missing main heading');
 if(!/classics-text-reader\.html\?work=|corpus\/[a-z0-9-]+\.html/i.test(html))errors.push(p+': missing original reader link');
 const block=html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i)?.[1];
 if(!block){errors.push(p+': no structured metadata');continue}
 try{
  const data=JSON.parse(block);
  if(data.url!==url||!data.mainEntity||!data.mainEntity.name||!data.mainEntity.author)errors.push(p+': incomplete CreativeWork/URL metadata');
 }catch{errors.push(p+': invalid JSON-LD')}
}
for(const url of urls.filter(x=>x.startsWith(base+'/obras/'))){
 const p=url.slice(base.length+1);
 if(!fs.existsSync(path.join(root,p)))errors.push(p+': sitemap points to missing page');
}
const count=urls.filter(x=>x.startsWith(base+'/obras/')).length;
assert.equal(count,files.length,'Mismatch between classical pages and sitemap');
const report={pages:files.length,sitemapUrls:urls.length,issues:errors};
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
