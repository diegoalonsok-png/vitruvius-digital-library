/* Editorial policy for all topics. Classification controls presentation, not factual claims. */
(function(root){"use strict";
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const profiles={
 ruler:{label:"Soberano",sections:["Identidad y titulatura","Reinado y cronología","Genealogía y sucesión","Política y religión","Textos e inscripciones","Arquitectura y arqueología","Fuentes primarias","Bibliografía académica"],documents:["royal-name","primary-text","architecture-drawing","museum-object","academic-book","research"]},
 architect:{label:"Arquitecto",sections:["Biografía","Formación e influencias","Obras y proyectos","Plantas, cortes y alzados","Perspectivas y croquis","Tratados y escritos","Legado","Bibliografía académica"],documents:["architecture-drawing","primary-text","academic-book","research"]},
 author:{label:"Autor o pensador",sections:["Biografía y contexto","Pensamiento y aportaciones","Obras y corpus","Textos originales y traducciones","Recepción crítica","Bibliografía académica"],documents:["primary-text","academic-book","research"]},
 scientist:{label:"Científico",sections:["Biografía y formación","Aportaciones y descubrimientos","Métodos y evidencia","Publicaciones","Recepción y aplicaciones","Bibliografía académica"],documents:["primary-text","academic-book","research"]},
 building:{label:"Edificio o monumento",sections:["Identificación y ubicación","Historia y autoría","Descripción arquitectónica","Plantas, cortes y alzados","Construcción y materiales","Conservación","Bibliografía académica"],documents:["architecture-drawing","museum-object","academic-book","research"]},
 work:{label:"Obra",sections:["Identificación y autoría","Fecha y contexto","Contenido y estructura","Testimonios y ediciones","Traducciones","Recepción crítica","Bibliografía académica"],documents:["primary-text","academic-book","research"]},
 place:{label:"Lugar",sections:["Localización y geografía","Historia","Patrimonio y cultura","Población y sociedad","Fuentes y bibliografía"],documents:["architecture-drawing","museum-object","research","academic-book"]},
 event:{label:"Acontecimiento histórico",sections:["Contexto","Cronología y desarrollo","Participantes","Consecuencias","Testimonios y fuentes","Historiografía"],documents:["primary-text","research","academic-book"]},
 concept:{label:"Concepto o tema",sections:["Definición","Origen y evolución","Características y clasificación","Teorías y evidencia","Aplicaciones","Bibliografía académica"],documents:["primary-text","research","academic-book"]},
 person:{label:"Persona",sections:["Biografía","Formación y trayectoria","Aportaciones","Obras y actividad","Legado","Bibliografía académica"],documents:["primary-text","research","academic-book"]},
 unknown:{label:"Tema por clasificar",sections:["Descripción","Contexto","Fuentes y referencias"],documents:[]}
};
function classify({description="",types=[],occupations=[],human=false}={}){
 const d=fold([description,...types,...occupations].join(" "));
 const has=re=>re.test(d);
 if(human||has(/\b(persona|human|humano)\b/)){
  if(has(/\b(faraon|pharaoh|pharaon|king|queen|rey|reina|monarch|monarque|monarca|emperor|emperador|imperatrice|empress)\b/))return "ruler";
  if(has(/\b(architect\w*|arquitect\w*|architet\w*|baumeister)\b/))return "architect";
  if(has(/\b(philosoph\w*|filosof\w*|writer|escritor\w*|poet\w*|author|auteur|ecrivain|theolog\w*|teolog\w*|historian|historiador\w*)\b/))return "author";
  if(has(/\b(scientist|cientific\w*|physicist|fisico|mathematician|matematic\w*|chemist|quimic\w*|biologist|biolog\w*)\b/))return "scientist";
  return "person";
 }
 const t=fold(types.join(" "));
 if(/\b(building|edificio|monument\w*|temple|templo|church|iglesia|palace|palacio|cathedral|catedral|architectural structure|estructura arquitectonica)\b/.test(t))return "building";
 if(/\b(book|libro|literary work|obra literaria|manuscript|manuscrito|painting|pintura|sculpture|escultura|musical work|obra musical|treatise|tratado)\b/.test(t))return "work";
 if(/\b(city|ciudad|municipality|municipio|country|pais|settlement|asentamiento|archaeological site|yacimiento arqueologico|geographic region|region geografica)\b/.test(t))return "place";
 if(/\b(event|acontecimiento|evento|battle|batalla|war|guerra|revolution|revolucion)\b/.test(t))return "event";
 if(/\b(concept|concepto|theory|teoria|discipline|disciplina|method|metodo|phenomenon|fenomeno)\b/.test(t))return "concept";
 return "unknown";
}
// Preserve the original encyclopedic order and headings; remove only navigation and ancillary content.
// Do not replace missing article sections by generated assertions.
function articleSections(extract){
 const rows=[];let current={heading:"Introducción",level:1,text:""};
 for(const line of String(extract||"").split(/\r?\n/)){
  const h=line.trim().match(/^(={2,6})\s*(.*?)\s*\1$/);
  if(h){if(current.text.trim())rows.push({...current,text:current.text.trim()});current={heading:h[2],level:h[1].length,text:""};}
  else current.text+=(current.text?"\n":"")+line;
 }
 if(current.text.trim())rows.push({...current,text:current.text.trim()});
 let skipped=0;
 return rows.filter(r=>{if(skipped&&r.level>skipped)return false;skipped=0;const h=fold(r.heading);if(/^(?:vease tambien|see also|voir aussi|enlaces externos|external links|liens externes|referencias|references|notes et references|bibliografia|bibliography|bibliographie|notas|notes|gallery|galeria|galerie|trivia|curiosidades|popular culture|cultura popular|culture populaire|discografia|filmografia)$/.test(h)){skipped=r.level;return false}return true});
}
function choose(direct,ranked){
 const unique=[...new Map(direct.map(x=>[x.id,x])).values()];
 if(unique.length===1&&!unique[0].ambiguous)return {primary:unique[0],alternatives:ranked.filter(x=>x.id!==unique[0].id)};
 return {primary:null,alternatives:[...new Map([...unique,...ranked].map(x=>[x.id,x])).values()]};
}
// Bibliographic authority is explicit. A DOI or ISBN alone is insufficient.
function admit(record,profile){
 if(!record||!profiles[profile]?.documents.includes(record.kind)||record.identityMatch!==true||!record.source||!record.url)return false;
 if(record.popular===true||record.synthetic===true||record.identityAmbiguous===true)return false;
 if(record.kind==="academic-book"||record.kind==="research")return record.academicProvenance===true;
 if(record.kind==="architecture-drawing")return record.documentaryType===true&&record.attributionVerified===true;
 return record.attributionVerified===true;
}
root.VitruviaNextPolicy={profiles,classify,articleSections,choose,admit};
})(globalThis);
