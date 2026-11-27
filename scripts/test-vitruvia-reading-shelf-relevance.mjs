/* Synthetic metadata regression; no claim of verified editions or live results. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const s=readFileSync(new URL("../assets/vitruvia-reading-shelf.js",import.meta.url),"utf8");
const select=new Function("document",s.slice(s.indexOf(" const normalize="),s.indexOf(" const official="))+s.slice(s.indexOf(" function validWork("),s.indexOf(" function coverUrl("))+"return selectedBooks;")({documentElement:{lang:"es"}});
const cases=[
 ["Roman architecture","Roman architecture",["Architecture"],"Oxford University Press",true],
 ["architecture romaine","L'architecture romaine",["Architecture"],"Presses universitaires de France",true],
 ["Rome","Rome: children and education",["Children","History"],"Cambridge University Press",true],
 ["Egipto","Egipto: desafíos de la arqueología",["Arqueología"],"Brill",true],
 ["Plato","Plato and fiction",["Fiction -- History and criticism"],"Brill",true],
 ["Homer","Homer: a novel",["Fiction"],"Oxford University Press",false],
 ["Tutankhamun","Tutankhamun",["Juvenile literature"],"Oxford University Press",false],
 ["Tutankhamun","My name is Tutankhamun",[],"Brill",false],
 ["Homer","Homer",["Picture books"],"Brill",false],
 ["Homer","Homer",["Children's fiction"],"Brill",false],
 ["Napoleon","Napoleon",[],"Unknown publisher",false],
 ["Napoleon","Napoleon",["Academic dissertations"],"",true],
 ["Vitruvius","Ten books of architecture",["Vitruvius"],"Cambridge University Press",true],
 ["Aristotle","Aristotlex",[],"Brill",false],
 ["Ramses II","Ramses III",[],"Brill",false],
 ["Dante","Dante",["Comic books"],"Brill",false],
 ["Roman history","Roman history",["Roman history"],"Routledge",true],
 ["Hatshepsut","Hatshepsut",["Activity books"],"Brill",false],
 ["Plato","Plato",["Young adult fiction"],"Brill",false],
 ["Greek literature","Greek literature",["Children's literature -- History and criticism"],"Brill",true]
];
for(const [i,[q,title,subject,publisher,expected]] of cases.entries()){
 const x={key:"/works/OL"+(i+1)+"W",title,author_name:["A. Researcher"],publisher:[publisher],subject,first_publish_year:2000};
 assert.equal(Boolean(select(q,[x]).length),expected,q+" / "+title);
}
const identity={entityKind:"person",wikidataId:"Q42",preferredWiki:true,entityCanonical:"Miguel de Cervantes",aliases:["Cervantes"]};
const authorResults=select("escritor cervantes",[
 {key:"/works/OL900W",title:"Don Quijote",author_name:["Miguel de Cervantes"],publisher:["Cambridge University Press"],subject:["Fiction"]},
 {key:"/works/OL901W",title:"Novela",author_name:["escritor cervantes"],publisher:["Brill"],subject:["Fiction"]}
],identity);
assert.equal(authorResults.length,1);
assert.equal(authorResults[0].kind,"primary");
console.log("PASS 20 bibliographic cases and one authority/primary-source scenario");
