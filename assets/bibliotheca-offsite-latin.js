/* Originales latinos de Séneca derivados de ediciones TEI documentadas;
 * alojados en rama separada para no añadir peso ni modificar códices o folios.
 */
(()=>{
"use strict";
if(window.ClassicsOffsiteLatin)return;
const BRANCH="corpus-originales-griegos-20261108";
const ROOT="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/"+BRANCH+"/data/offsite-originals/";
const ALLOWED=new Set(["seneca-de-ira","seneca-de-tranquillitate"]);
let manifestTask=null;
const cache=new Map();
function valid(e,seen){
 if(!e||!ALLOWED.has(e.workId)||seen.has(e.workId)||
    e.language!=="la"||e.path!=="data/offsite-originals/"+e.workId+"-la.json"||
    typeof e.title!=="string"||!e.title.trim()||
    typeof e.author!=="string"||!e.author.trim()||
    typeof e.source!=="string"||
    !/^https:\/\/raw\.githubusercontent\.com\/PerseusDL\/canonical-latinLit\/master\/data\/stoa0255\//.test(e.source)||
    typeof e.sourceSha256!=="string"||!/^[a-f0-9]{64}$/.test(e.sourceSha256)||
    !Number.isInteger(e.passages)||e.passages<5)return false;
 seen.add(e.workId);
 return true;
}
function entries(){
 if(!manifestTask)manifestTask=fetch(ROOT+"latin-manifest.json")
  .then(r=>{if(!r.ok)throw Error("Corpus latino no disponible: HTTP "+r.status);return r.json()})
  .then(manifest=>{
    if(manifest?.schema!=="vitruvius-offsite-latin-originals-manifest-v1"||
       manifest.branch!==BRANCH||!Array.isArray(manifest.entries)||
       manifest.count!==ALLOWED.size||manifest.entries.length!==ALLOWED.size)
      throw Error("Inventario latino externo incompleto");
    const seen=new Set();
    return manifest.entries.map(e=>{
      if(!valid(e,seen))throw Error("Metadatos latinos sin procedencia válida");
      return {
        workId:e.workId,author:e.author,title:e.title,language:"la",
        format:"remote-latin-passages",
        path:ROOT+e.workId+"-la.json",
        reader:"classics-remote-latin-reader.html?work="+e.workId,
        sourceDescription:e.attribution||"Séneca · edición latina TEI Perseus",
        source:e.source,sourceSha256:e.sourceSha256
      };
    });
  }).catch(error=>{console.warn("Corpus latino externo no verificado:",error.message);return []});
 return manifestTask;
}
function load(e){
 if(!e||e.format!=="remote-latin-passages"||!ALLOWED.has(e.workId)||
    e.path!==ROOT+e.workId+"-la.json"||!/^[0-9a-f]{64}$/.test(e.sourceSha256||""))
  return Promise.resolve(null);
 if(!cache.has(e.path))cache.set(e.path,fetch(e.path)
  .then(r=>{if(!r.ok)throw Error("Original latino remoto no disponible");return r.json()})
  .then(d=>d?.schema==="vitruvius-offsite-latin-original-v1"&&
    d.workId===e.workId&&d.language==="la"&&d.sourceSha256===e.sourceSha256&&
    Array.isArray(d.passages)&&d.passages.length>=5&&
    d.passages.every(p=>typeof p.locus==="string"&&typeof p.text==="string")?d:null)
  .catch(()=>null));
 return cache.get(e.path).then(d=>d&&d.sourceSha256===e.sourceSha256?d:null);
}
window.ClassicsOffsiteLatin={entries,load,root:ROOT,allowedWorkIds:[...ALLOWED]};
})();
