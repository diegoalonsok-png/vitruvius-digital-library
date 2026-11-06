/* Route Vitruvian topics to the site's verified corpus before generic web cards.
 * Never infer that a manuscript image has searchable/transcribed text.
 * Exact lexicon matches, not arbitrary Latin-looking tokens, trigger the route.
 */
(()=>{
 "use strict";
 const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ς/g,"σ").trim();
 const latin=s=>fold(s).replace(/j/g,"i").replace(/v/g,"u");
 const author=/\b(vitruvio|vitruvius|vitruve|vitruvii|vitruvian[oa]?|vitrubio|de architectura)\b/i;
 const preface=/\b(prefacios?|prefaces?|praefatio(?:nes)?|praef|pref|prefazione|prolog[ou]s?|proem(?:io|ium))\b/i;
 const chapter=/\b(libro|liber|libri|livre|book|capitulo|capítulo|chapitre|chapter|caput)\s+(?:[ivx]+|\d{1,2})\b/i;
 const loci=/^(?:(?:vitr(?:uvio|uvius|uve)?)[,.\s]*)?(?:[ivx]{1,5}|\d{1,2})\.(?:praef|\d{1,2})(?:\.\d{1,3})?$/i;
 function plan(query,entries=[]){
  const q=fold(query),word=q.replace(/\s+/g," ");
  const cleaned=word.replace(/\s+(?:de|del|en|in|of|chez)\s+(?:vitruvio|vitruvius|vitruve)\b/g,"").trim();
  const lemma=cleaned.split(/\s+/).length===1?cleaned:"";
  const found=lemma&&(entries||[]).find(e=>[e.lemma,...(e.forms||[]),...(e.aliases||[]),e.greek].filter(Boolean).some(form=>latin(form)===latin(lemma)));
  const exactAuthor=author.test(q);
  const explicitPreface=preface.test(q)&&(exactAuthor||/^(?:prefacios?|prefaces?|praefatio|praefationes)$/i.test(q));
  const directChapter=chapter.test(q)&&(exactAuthor||/^(?:libro|liber|livre|book)\s+(?:[ivx]+|\d{1,2})(?:\s+(?:capitulo|capítulo|chapitre|chapter)\s+(?:[ivx]+|\d{1,2}))?$/i.test(q));
  const reference=loci.test(q);
  const focused=Boolean(exactAuthor||explicitPreface||directChapter||reference||found);
  return {focused,reason:found?"lexicon":explicitPreface?"preface":directChapter||reference?"locus":exactAuthor?"vitruvius":null,
   lemma:found?.lemma||null,query:found?.lemma||query,hasExactLexiconMatch:!!found};
 }
 function promote(rows,query,entries){
  const intention=plan(query,entries);
  const hasLatinPassage=rows.some(r=>r.type==="passage"&&["recensio-es","recensio-fr","theory-en"].includes(r.edition)&&/latín original|latin original/i.test(r.author||""));
  if(!intention.focused&&!hasLatinPassage&&!rows.some(r=>r.type==="book"&&r.localReader&&fold(r.author)===fold(query)))return rows;
  const weight=r=>{
   // An author such as Catullus must open the local verified text ahead
   // of encyclopedia cards, without treating the work as a Vitruvian passage.
   if(r.type==="book"&&r.localReader&&fold(r.author)===fold(query))return 0;
   if(r.type==="preface"&&!r.prefacePlaceholder)return 0;
   if(r.type==="passage"&&["recensio-es","recensio-fr","theory-en"].includes(r.edition))return 1;
   if(r.type==="section"&&/^Ficha del término/.test(r.title||""))return 2;
   if(r.type==="apparatus")return 3;
   if(r.type==="manuscript")return 4;
   if(r.type==="edition")return 5;
   if(r.type==="book"&&(r.workId==="vitruvius"||/\bvitruv/i.test(r.title||"")))return 6;
   if(["wikipedia","wikidata"].includes(r.type))return 20;
   return 10;
  };
  return rows.map((r,i)=>({r,i,w:weight(r)})).sort((a,b)=>a.w-b.w||a.i-b.i).map(x=>x.r);
 }
 window.VitruviaLocalPriority={plan,promote,version:"20261105-first"};
})();