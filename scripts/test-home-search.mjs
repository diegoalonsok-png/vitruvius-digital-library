// Regression checks for the public Vitruvius homepage query engine.
// Execute in a local clone: node scripts/test-home-search.mjs
// Tests the actual search-core implementation and V514 structured index;
// it does NOT claim browser/Cloudflare availability or full V554/V297 coverage.
import {readFileSync} from "node:fs";
import {searchCorpus} from "../assets/search-core.mjs";
import {readSearchState} from "../assets/home-search-state.mjs";

const data=JSON.parse(readFileSync(new URL("../data/structured/recensio-es.json",import.meta.url),"utf8"));
if(data.edition!=="recensio-es"||data.passages.length!==731)throw Error("Unexpected V514 index");
const groups={
 architecture:["architectura","architectus","architecti","fabrica","ordinatio","dispositio","eurythmia","symmetria","decor","distributio","proportio","commensuratio","modulus","ratio","templum","aedes","columna","capitulum","basis","stylobata","podium","porticus","peristylum","atrium","cavaedium","impluvium","compluvium","triclinium","tablinum","domus","insula","forum","basilica","theatrum","amphitheatrum","balneum","thermae","aquaeductus","castellum","opus","caementum","calx","arena","lateres","lapis","marmor","lignum","tignum","trabes","testudo","fornix","arcus","machina","machinatio","chorobates","dioptra","gnomon","horologium","clepsydra","hydraulica","scenographia","ichnographia","orthographia","perspectiva","pictura","musica","harmonia"],
 latin:["numen","divina","mens","Caesar","imperator","scientia","doctrina","ingenium","ars","natura","corpus","homo","pedes","manus","digitus","cubitus","palma","altitudo","longitudo","latitudo","crassitudo","centrum","circulus","quadratus","triangulus","decem","unus","duo","tres","quattuor","quinque","sex","septem","octo","novem","terra","ignis","aer","aqua","ventus","sol","luna","stella","mundus","caelum","tempus","lux","umbra","rex","urbs","via","murum","navis","mare","portus","flumen","nomen","locus","praefatio","liber","caput","signum"],
 greekAndTransliteration:["ἀναλογία","συμμετρία","κόσμος","ἀρχιτέκτων","analogia","symmetria","eurythmia","harmonia","scenographia","ichnographia","orthographia","entasis","peripteros","dipteros","pseudodipteros","hypaethros","pycnostylos","diastylos","eustylos","pteron","epistylion","metopa","triglyphus","proscaenium","orchestra","caryatides"]
};
const alias=readSearchState(new URLSearchParams("query=numen"));
const canonical=readSearchState(new URLSearchParams("q=numen"));
if(alias?.query!=="numen"||canonical?.query!=="numen")throw Error("Query URL alias broken");
const stats={},details=[];
for(const [group,words] of Object.entries(groups)){
 let hits=0,zero=0;
 for(const word of words){
  const r=searchCorpus([data],{query:word,kind:"words",mode:"words",language:"all"});
  if(!Array.isArray(r.results))throw Error("Missing results array for "+word);
  if(r.results.length)hits++;else zero++;
  details.push({group,word,matches:r.results.length});
 }
 stats[group]={queries:words.length,withMatches:hits,noMatches:zero};
}
const numen=details.find(x=>x.word==="numen");
if(!numen||numen.matches<1)throw Error("Regression failure: numen missing");
const out={schema:"vdl-search-regression-v1",edition:data.edition,passages:data.passages.length,engine:"search-core.mjs",checks:details.length,stats,numenMatches:numen.matches,limitations:"Corpus engine test only; Greek transliteration mapping in search-worker and deployed browser must be tested separately",details};
process.stdout.write(JSON.stringify(out,null,2)+"\n");
