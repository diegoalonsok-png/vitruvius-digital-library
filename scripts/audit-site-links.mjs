import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,dirname,relative,extname} from 'node:path';
const root=process.cwd(),pages=[];
function visit(dir){for(const item of readdirSync(dir,{withFileTypes:true})){if(item.name.startsWith('.'))continue;const path=resolve(dir,item.name);if(item.isDirectory()){if(!['node_modules','vendor'].includes(item.name))visit(path)}else if(item.name.endsWith('.html'))pages.push(path);}}
visit(root);
const problems=[],warnings=[];let targets=0,links=0;
for(const file of pages){
 const source=readFileSync(file,'utf8');
 const ids=new Set([...source.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]));
 const refs=[...source.matchAll(/\b(href|src)\s*=\s*["']([^"']+)["']/gi)];
 for(const [,attr,raw] of refs){
  links++;const value=raw.trim();
  if(!value||/^(?:https?:|mailto:|tel:|data:|javascript:|blob:|about:|\/\/)/i.test(value))continue;
  if(value.startsWith('#')){const id=decodeURIComponent(value.slice(1));if(id&&!ids.has(id))warnings.push(relative(root,file)+': anchor #'+id+' absent (may be dynamic)');continue;}
  const path=value.split(/[?#]/)[0];if(!path)continue;
  const target=path.startsWith('/')?resolve(root,path.slice(1)):resolve(dirname(file),path);
  if(!target.startsWith(root+'/')){problems.push(relative(root,file)+': outside project '+value);continue;}
  targets++;
  if(!existsSync(target)&&!existsSync(target+'/index.html'))problems.push(relative(root,file)+': '+attr+'='+value+' missing');
 }
 const controls=[...source.matchAll(/<button\b([^>]*)>/gi)];
 for(const [,attrs] of controls){
  if(/\bdisabled\b/i.test(attrs))continue;
  if(/\btype\s*=\s*["']submit["']/i.test(attrs))continue;
  if(/\bid\s*=/.test(attrs)||/\bdata-/.test(attrs)||/\bonclick\s*=/.test(attrs))continue;
  // Requires interactive-browser verification; static HTML cannot prove handlers.
  warnings.push(relative(root,file)+': unbound button requires runtime check');
 }
}
console.log('HTML pages: '+pages.length+'; refs: '+links+'; local targets: '+targets);
for(const x of warnings.slice(0,40))console.warn('REVIEW',x);
if(warnings.length>40)console.warn('Other review items:',warnings.length-40);
for(const x of problems)console.error('BROKEN',x);
if(problems.length){console.error('Broken local links:',problems.length);process.exitCode=1;}else console.log('All local HTML href/src destinations exist. Browser interactions still require manual testing.');
