/* Academic bilingual highlighter (Vitruvius, 2026).
 * Provenance: terminological aliases are editorial hypotheses; the only
 * guaranteed alignment is by Vitruvian locus, not word-by-word collation.
 * No modification of the underlying Latin or translations.
 */
const VOCABULARY=[
 {id:"geometria",la:["geometria","geometriae","geometriam","geometriae","geometricis","geometricus","geometrici"],es:["geometría","geometrico","geométrico","geométrica","geométricos","geométricas"],fr:["géométrie","géométrique","géométriques"],en:["geometry","geometric","geometrical"]},
 {id:"locus",la:["locus","loci","locum","loco","locis","locorum","loca","locorum"],es:["lugar","lugares","sitio","sitios","emplazamiento","emplazamientos","ubicación","ubicaciones"],fr:["lieu","lieux","endroit","endroits","emplacement","emplacements","site","sites"],en:["place","places","location","locations","site","sites","position","positions"]},
 {id:"symmetria",la:["symmetria","symmetriae","symmetriam","symmetrias","symmetriarum","symmetriis","symmetriae"],es:["simetría","simetrías","proporción","proporciones","proporcionalidad"],fr:["symétrie","symétries","proportion","proportions"],en:["symmetry","symmetries","proportion","proportions","proportionality"]},
 {id:"templum",la:["templum","templi","templo","templis","templa","templorum","templorum","templos"],es:["templo","templos","santuario","santuarios"],fr:["temple","temples","sanctuaire","sanctuaires"],en:["temple","temples","sanctuary","sanctuaries"]},
 {id:"aqua",la:["aqua","aquae","aquam","aquarum","aquis","aquas"],es:["agua","aguas"],fr:["eau","eaux"],en:["water","waters"]},
 {id:"architectura",la:["architectura","architecturae","architecturam","architecturis","architectus","architecti","architectum","architectis"],es:["arquitectura","arquitecturas","arquitecto","arquitectos"],fr:["architecture","architectures","architecte","architectes"],en:["architecture","architectures","architect","architects"]},
 {id:"columna",la:["columna","columnae","columnam","columnas","columnarum","columnis"],es:["columna","columnas"],fr:["colonne","colonnes"],en:["column","columns"]},
 {id:"machina",la:["machina","machinae","machinam","machinas","machinis","machinarum"],es:["máquina","máquinas","artefacto","artefactos"],fr:["machine","machines"],en:["machine","machines"]},
 {id:"proportio",la:["proportio","proportionis","proportiones","proportionibus","proportione","commensus","commensuratio"],es:["proporción","proporciones","conmensuración"],fr:["proportion","proportions","commensurabilité"],en:["proportion","proportions","commensurability"]},
 {id:"modulus",la:["modulus","moduli","modulum","modulo","modulos","modulis","modulorum"],es:["módulo","módulos","medida","medidas"],fr:["module","modules","mesure","mesures"],en:["module","modules","measure","measures"]},
 {id:"dispositio",la:["dispositio","dispositionis","dispositionem","dispositione"],es:["disposición","disposiciones","ordenación"],fr:["disposition","dispositions","agencement"],en:["disposition","arrangement","arrangements"]},
 {id:"eurythmia",la:["eurythmia","eurythmiae","eurythmiam"],es:["euritmia","euritmia","armonía"],fr:["eurythmie","harmonie"],en:["eurythmy","harmony"]},
 {id:"forum",la:["forum","fori","foro","foris","fora","fororum"],es:["foro","foros","plaza","plazas"],fr:["forum","forums","place","places"],en:["forum","forums","square","squares"]},
 {id:"theatrum",la:["theatrum","theatri","theatro","theatra","theatris"],es:["teatro","teatros"],fr:["théâtre","théâtres"],en:["theatre","theatres","theater","theaters"]},
 {id:"porticus",la:["porticus","porticum","porticibus","porticu","porticuum"],es:["pórtico","pórticos","galería","galerías"],fr:["portique","portiques","galerie","galeries"],en:["portico","porticoes","porticoes","colonnade","colonnades"]},
 {id:"ratio",la:["ratio","rationis","rationem","ratione","rationes","rationibus"],es:["razón","razones","método","métodos"],fr:["raison","raisons","méthode","méthodes"],en:["reason","reasons","method","methods"]}
];
const normalize=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/æ/gi,"ae").replace(/œ/gi,"oe").toLowerCase().trim();
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const wordTokens=text=>[...String(text).matchAll(/[\p{L}\p{M}]+/gu)].map(m=>({value:m[0],norm:normalize(m[0]),start:m.index,end:m.index+m[0].length}));
const normalizedSets=VOCABULARY.map(c=>({...c,laSet:new Set(c.la.map(normalize)),esSet:new Set(c.es.map(normalize)),frSet:new Set(c.fr.map(normalize)),enSet:new Set(c.en.map(normalize))}));
function conceptFor(query){
 const q=normalize(query);
 if(!q||!/^[-\p{L}\p{M}]+$/u.test(query.trim()))return null;
 return normalizedSets.find(c=>["laSet","esSet","frSet","enSet"].some(k=>c[k].has(q)))||null
}
function sourceAnchored(concept,latin){
 if(!concept)return false;
 return wordTokens(latin).some(x=>concept.laSet.has(x.norm))
}
/** Highlight only visibly present words; conceptual equivalents are marked as editorial suggestions. */
export function parallelHighlight(text,{query="",lang="es",latin=""}={}){
 const q=normalize(query),target=String(text??""),concept=conceptFor(query),tokens=wordTokens(target);
 if(!q||!target||!/^[-\p{L}\p{M}]+$/u.test(query.trim()))return null;
 const set=concept?.[lang+"Set"]||null;
 const anchored=sourceAnchored(concept,latin);
 let html="",at=0,direct=0,equivalent=0;
 const words=[];
 for(const word of tokens){
  const literal=word.norm===q;
  const alias=!literal&&Boolean(concept&&set?.has(word.norm)&&anchored);
  if(!literal&&!alias)continue;
  html+=escape(target.slice(at,word.start));
  const title=alias?' title="Equivalencia léxica orientativa; no es alineación palabra por palabra"':'';
  html+='<mark class="search-hit '+(alias?'search-hit-equivalent':'search-hit-literal')+'"'+title+'>'+escape(word.value)+'</mark>';
  at=word.end;
  if(literal)direct++;else equivalent++;
  words.push(word.value);
 }
 html+=escape(target.slice(at));
 return {html,direct,equivalent,concept:concept?.id||null,anchored,words:[...new Set(words)]}
}
/** If the equivalent is far into a long translation, center that excerpt on real source text. */
export function parallelExcerpt(text,{query="",lang="es",latin="",max=1700}={}){
 const t=String(text??"");if(t.length<=max)return t;
 const c=conceptFor(query),anchored=sourceAnchored(c,latin),set=anchored?c?.[lang+"Set"]:null;
 const tokens=wordTokens(t);
 const direct=tokens.find(w=>w.norm===normalize(query));
 const alt=direct||tokens.find(w=>set?.has(w.norm));
 if(!alt)return t.slice(0,max)+" …";
 const begin=Math.max(0,Math.min(alt.start-250,t.length-max)),end=Math.min(t.length,begin+max);
 return (begin?"… ":"")+t.slice(begin,end)+(end<t.length?" …":"")
}
export const documentedVocabulary=VOCABULARY.map(x=>x.id);
