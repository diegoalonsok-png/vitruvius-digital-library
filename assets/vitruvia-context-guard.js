/* Vitruvia: contextual provenance gate for the ancient corpus.
 * A name appearing in a manuscript or classical work is not an identity match.
 * No ancient text is removed from the catalogue; only irrelevant search hits are hidden.
 */
(()=>{"use strict";
 const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
 const stop=new Set("de del la las los el lo un una unos unas y e o a al en por para sobre con the of and or a an by from in on for to le les des du au aux et de da do dos das der die und von".split(" "));
 const ignore=new Set("quien quien fue quien es biografia vida historia history biography life obras obra works work imagen imagenes fotos fotografias image images sobre about".split(" "));
 const ancientSignals=new Set("antiguo antigua antiguos antiguas antiguedad grecorromano grecorromana grecolatino grecolatina griego griega griegos griegas latin latines latina latinas romano romana romanos romanas roma helenico helenica helenismo helenistica clasico clasica clasicos clasicas codex codice codices codice manuscrito manuscritos papiro papiros pergamino folio folios vitruvio vitruvius vitruve arquitectura antigua".split(" "));
 const ancientRecordTypes=new Set(["book","manuscript","edition","preface","passage","apparatus","fragment"]);
 const terms=value=>norm(value).split(" ").filter(t=>t.length>=3&&!stop.has(t));
 const meaningful=value=>terms(value).filter(t=>!ignore.has(t));
 function explicitAncientContext(query){
  const t=terms(query);
  return t.some(word=>ancientSignals.has(word))||/\b(?:de architectura|greek and latin|ancient (?:rome|greece|history)|roma antigua|grecia antigua|historia antigua)\b/.test(norm(query));
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
  return !!(identity&&identity.kind==="person"&&Number.isFinite(Number(identity.birthYear))&&Number(identity.birthYear)>=1500);
 }
 function allows(row,query,identity){
  if(!row||!ancientRecordTypes.has(row.type))return true;
  // Human biographical identity after 1500 overrides incidental ancient words.
  // Exception: an explicit query for antiquity is a comparative research intent.
  if(isModernIdentity(identity)&&!explicitAncientContext(query))return false;
  if(explicitAncientContext(query))return true;
  if(row.type==="passage"&&row.exactTextMatch&&meaningful(query).length>=4)return true;
  return exactSubjectMatch(query,row);
 }
 function filter(rows,query,identity){
  return (rows||[]).filter(row=>allows(row,query,identity));
 }
 window.VitruviaContextGuard={norm,terms,meaningful,explicitAncientContext,exactSubjectMatch,isModernIdentity,allows,filter,version:"1.0"};
})();