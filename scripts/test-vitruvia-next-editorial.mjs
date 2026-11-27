import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

function tests(policy,core,assert){
 const sandbox={};new Function("globalThis",policy)(sandbox);new Function("globalThis",core)(sandbox);const p=sandbox.VitruviaNextPolicy,c=sandbox.VitruviaNextCore;let n=0;
 const check=(ok,name)=>{assert(ok,name);n++};
 for(const [input,expected] of [
 [{human:true,occupations:["architect","writer"]},"architect"],[{human:true,occupations:["pharaoh"]},"ruler"],[{human:true,occupations:["philosopher"]},"author"],[{human:true,occupations:["physicist"]},"scientist"],[{human:true,occupations:["composer"]},"artist"],[{human:true},"person"],[{types:["building"]},"building"],[{types:["literary work"]},"work"],[{types:["city"]},"place"],[{types:["battle"]},"event"],[{types:["concept"]},"concept"],[{description:"unknown"},"unknown"],[{description:"architectural monument",types:["city"]},"place"]
 ])check(p.classify(input)===expected,"profile "+expected);
 check(!p.choose([],[{id:1}]).primary,"rank alone is not identity");
 check(!p.choose([{id:1,ambiguous:true}],[]).primary,"disambiguation is not article");
 check(p.choose([{id:1}],[]).primary.id===1,"unique direct match");
 check(p.choose([{id:1},{id:2}],[]).primary===null,"multiple identities require selection");
 check(p.articleSections("Lead\n== History ==\nBody\n== References ==\nRefs\n=== More ===\nRefs\n== Legacy ==\nText").map(x=>x.heading).join(",")==="Introducción,History,Legacy","retain substantive sections only");
 check(p.articleSections("Lead\n== Discography ==\nAlbum list").length===2,"retain artistic corpus");
 const doc={kind:"architecture-drawing",identityMatch:true,source:"archive",url:"https://example.org",attributionVerified:true,documentaryType:true};
 check(p.admit(doc,"architect"),"admit attributed drawing");
 check(!p.admit({...doc,documentaryType:false},"architect"),"exclude photo as drawing");
 check(!p.admit({...doc,identityMatch:false},"architect"),"exclude unrelated document");
 check(!p.admit({...doc,synthetic:true},"architect"),"exclude synthetic evidence");
 check(!p.admit(doc,"scientist"),"exclude inappropriate document type");
 const book={kind:"academic-book",identityMatch:true,source:"catalogue",url:"https://example.org",academicProvenance:true};
 check(p.admit(book,"ruler"),"admit academic publisher record");
 check(!p.admit({...book,academicProvenance:false},"ruler"),"exclude unverified publisher");
 check(!p.admit({...book,popular:true},"ruler"),"exclude popular book");
 check(!p.admit({...book,identityAmbiguous:true},"ruler"),"exclude ambiguous attribution");
 check(c.subject("rey Tut","es")==="Tutankamón","alias resolution");
 check(c.articleUrl(42,"es").includes("exsectionformat=wiki"),"article sections requested");
 check(c.claimIds({claims:{P106:[{rank:"deprecated",mainsnak:{datavalue:{value:{id:"Q1"}}}},{mainsnak:{datavalue:{value:{id:"Q2"}}}}]}},"P106").join(",")==="Q2","ignore deprecated claims");
 return n;
}

const read=p=>readFileSync(new URL("../assets/"+p,import.meta.url),"utf8");console.log(tests(read("vitruvia-next-policy.js"),read("vitruvia-next-core.js"),assert)+" editorial checks passed (fixtures, not live browser).");
