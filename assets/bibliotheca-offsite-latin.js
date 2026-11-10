/* Indexed Latin transcriptions outside GitHub Pages (TEI or documented digital source). No changes to folios or codices. */
(()=>{
"use strict";
if(window.ClassicsOffsiteLatin)return;
const BRANCH="corpus-originales-latinos-20261108";
const ROOT="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/"+BRANCH+"/data/offsite-latin/";
const SOURCE_PATHS={
 "seneca-de-ira":"https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/stoa0255/stoa010/stoa0255.stoa010.perseus-lat2.xml",
 "seneca-de-tranquillitate":"https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/stoa0255/stoa013/stoa0255.stoa013.perseus-lat2.xml",
 "apuleius-de-deo-socratis":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/apuleius/apuleius.deosocratis.txt",
 "censorinus-die-natali":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/censorinus.txt",
 "vegetius-epitoma":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/vegetius1.txt",
 "seneca-naturales":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/sen/sen.qn1.txt",
 "velleius-historia":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/vell1.txt",
 "frontinus-gromatica":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/frontinus/qualitate.txt",
 "isidore-etymologiae":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/isidore/1.txt",
 "siculus-flaccus":"https://la.wikisource.org/wiki/De_condicionibus_agrorum",
 "ennius-annales":"https://raw.githubusercontent.com/cltk/lat_text_latin_library/master/enn.txt"
};
const ALLOWED=new Set(Object.keys(SOURCE_PATHS));
let manifestTask=null;
const cache=new Map();
function valid(x,seen){
 if(!x||!ALLOWED.has(x.workId)||seen.has(x.workId)||x.language!=="la"||
   x.path!=="data/offsite-latin/"+x.workId+"-la.json"||
   typeof x.sourceSha256!=="string"||!/^[0-9a-f]{64}$/.test(x.sourceSha256)||
   !Number.isInteger(x.passages)||x.passages<5||
   typeof x.title!=="string"||!x.title.trim()||
   typeof x.author!=="string"||!x.author.trim()||
   typeof x.source!=="string"||x.source!==SOURCE_PATHS[x.workId])return false;
 seen.add(x.workId);return true;
}
function entries(){
 if(!manifestTask)manifestTask=fetch(ROOT+"manifest.json")
  .then(r=>{if(!r.ok)throw Error("No se pudo obtener el índice latino: HTTP "+r.status);return r.json()})
  .then(j=>{
   if(j?.schema!=="vitruvius-offsite-latin-originals-manifest-v1"||j.branch!==BRANCH||
     !Array.isArray(j.entries)||j.entries.length!==j.count||j.count>ALLOWED.size)
     throw Error("Manifiesto latino no verificable");
   const seen=new Set();
   return j.entries.map(x=>{
    if(!valid(x,seen))throw Error("Origen de TEI latino no verificado");
    return {workId:x.workId,language:"la",author:x.author,title:x.title,
      format:"remote-json-passages",path:ROOT+x.workId+"-la.json",
      reader:"classics-remote-latin-reader.html?work="+x.workId,
      sourceDescription:x.attribution||"Texto latino digital; edición y testigos según procedencia",
      source:x.source,sourceSha256:x.sourceSha256,sourceUrn:x.sourceUrn||""};
   });
  }).catch(error=>{console.warn("Originales latinos remotos no disponibles:",error.message);return []});
 return manifestTask;
}
function load(e){
 if(!e||e.language!=="la"||e.format!=="remote-json-passages"||
   !ALLOWED.has(e.workId)||e.path!==ROOT+e.workId+"-la.json")return Promise.resolve(null);
 if(!cache.has(e.path))cache.set(e.path,fetch(e.path)
  .then(r=>{if(!r.ok)throw Error("No se pudo descargar original latino");return r.json()})
  .then(j=>j?.schema==="vitruvius-offsite-latin-original-v1"&&
    j.workId===e.workId&&j.language==="la"&&/^[0-9a-f]{64}$/.test(j.sourceSha256||"")&&
    Array.isArray(j.passages)&&j.passages.length>=5&&
    j.passages.every(p=>typeof p.text==="string"&&p.text.trim()&&
      typeof p.locus==="string"&&p.locus.trim())?j:null)
  .catch(()=>null));
 return cache.get(e.path).then(j=>j&&j.sourceSha256===e.sourceSha256?j:null);
}
/* No Bloom filter yet; a conservative true cannot hide genuine occurrences. */
function mightContain(){return true}
window.ClassicsOffsiteLatin={entries,load,mightContain,root:ROOT,allowedWorkIds:[...ALLOWED]};
})();
