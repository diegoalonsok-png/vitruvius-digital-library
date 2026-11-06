/* Vitruvia: contextual provenance gate for the ancient corpus.
 * A name appearing in a manuscript or classical work is not an identity match.
 * No ancient text is removed from the catalogue; only irrelevant search hits are hidden.
 */
(()=>{"use strict";
 const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
 const stop=new Set("de del la las los el lo un una unos unas y e o a al en por para sobre con the of and or a an by from in on for to le les des du au aux et de da do dos das der die und von".split(" "));
 const ignore=new Set("quien quien fue quien es biografia vida historia history biography life obras obra works work imagen imagenes fotos fotografias image images sobre about".split(" "));
 const ancientSignals=new Set("antiguo antigua antiguos antiguas antiguedad grecorromano grecorromana grecolatino grecolatina griego griega griegos griegas latin latines latina latinas romano romana romanos romanas roma helenico helenica helenismo helenistica clasico clasica clasicos clasicas codex codice codices codice manuscrito manuscritos papiro papiros pergamino folio folios vitruvio vitruvius vitruve".split(" "));
 const ancientRecordTypes=new Set(["book","manuscript","edition","preface","passage","apparatus","fragment"]);
 const terms=value=>norm(value).split(" ").filter(t=>t.length>=3&&!stop.has(t));
 const meaningful=value=>terms(value).filter(t=>!ignore.has(t));
 function explicitAncientContext(query,identity=null){
  // A word that is part of the exact modern proper name (Romano Prodi,
  // for example) is not an independent request to study Roman antiquity.
  const identityWords=isModernIdentity(identity)?
   new Set(terms(identity.canonical||identity.catalogName||"")):new Set();
  const t=terms(query).filter(word=>!identityWords.has(word));
  return t.some(word=>ancientSignals.has(word))||
   /\b(?:de architectura|greek and latin|ancient (?:rome|greece|history)|roma antigua|grecia antigua|historia antigua)\b/.test(norm(query));
 }
 function exactSubjectMatch(query,row){
  const q=meaningful(query);if(!q.length)return false;
  const titles=[row.title,row.author,row.entityCanonical,...(row.aliases||[])].map(norm).filter(Boolean);
  const name=norm(query);
  if(titles.some(t=>t===name))return true;
  // A classical record may match its title AND author. All distinctive
  // query tokens must be present; one shared "Juan" cannot pass a three-name query.
  const combined=new Set(terms([row.title,row.author,...(row.aliases||[])].join(" ")));
  return q.every(word=>combined.has(word));
 }
 function isModernIdentity(identity){
  return !!(identity&&[identity.birthYear,identity.inceptionYear,identity.publicationYear].some(year=>year!=null&&Number.isFinite(Number(year))&&Number(year)>=1500));
 }
 function allows(row,query,identity){
  if(!row||!ancientRecordTypes.has(row.type))return true;
  // Human biographical identity after 1500 overrides incidental ancient words.
  // Exception: an explicit query for antiquity is a comparative research intent.
  const ancientIntent=explicitAncientContext(query,identity);
  if(isModernIdentity(identity)&&!ancientIntent)return false;
  if(ancientIntent)return true;
  // Actual source-text matches remain accessible for philological terms
  // like Gallia even if the term is absent from the work's title.
  if(row.type==="passage"&&row.exactTextMatch)return true;
  if(["passage","apparatus","fragment"].includes(row.type)){
   const q=meaningful(query),evidence=new Set(terms([
    row.latin,row.greek,row.original,row.text,row.translation,row.excerpt,row.sourceText
   ].filter(Boolean).join(" ")));
   if(q.length&&q.every(word=>evidence.has(word)))return true;
  }
  return exactSubjectMatch(query,row);
 }
 function filter(rows,query,identity){
  return (rows||[]).filter(row=>allows(row,query,identity));
 }
 window.VitruviaContextGuard={norm,terms,meaningful,explicitAncientContext,exactSubjectMatch,isModernIdentity,allows,filter,version:"1.0"};
})();