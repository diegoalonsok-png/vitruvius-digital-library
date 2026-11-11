/* Source-specific routing: fewer irrelevant requests, no paid search APIs.
   Source priority does not certify accuracy or peer review. */
(()=>{'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function plan(query,identity){
 const q=norm(query),desc=norm([identity?.description,identity?.authorityDescription,identity?.occupation].filter(Boolean).join(' '));
 const text=q+' '+desc;
 const contains=re=>re.test(text);
 const visual=contains(/\b(?:pintor|painter|painting|sculpt\w*|escult\w*|artista|visual|museum|museo|pintur\w*|cuadro\w*|arte|artwork|photograph\w*|fotograf\w*)\b/);
 const architectural=contains(/\b(?:arquitect\w*|architect\w*|edificio\w*|building\w*|urbanis\w*|fachada\w*|facade|monument\w*|templo\w*|temple\w*)\b/);
 const medicine=contains(/\b(?:medic\w*|clinic\w*|disease\w*|enfermedad\w*|epidemi\w*|salud|biolog\w*|virus|anatom\w*|pharmac\w*|vaccine\w*)\b/);
 const science=contains(/\b(?:matematic\w*|math\w*|equation\w*|ecuacion\w*|ingenier\w*|engineering|physics|fisic\w*|formula\w*|wind load|carga de viento|torsion|estatica|statics|mechanic\w*|mecanic\w*|algorithm\w*|algoritmo\w*)\b/);
 const literary=contains(/\b(?:literatur\w*|escritor\w*|writer\w*|poet\w*|novela\w*|novel\w*|libro\w*|book\w*|manuscrit\w*|codice\w*|codex|editorial\w*|filolog\w*|philolog\w*|latin\w*|greek|griego\w*)\b/);
 const music=contains(/\b(?:music\w*|compositor\w*|composer\w*|singer\w*|cantante\w*|album\w*|disco\w*|band\w*|banda\w*|song\w*|cancion\w*)\b/);
 let providers=['wikidata','crossref','openAlex'];
 if(medicine)providers.push('europePmc');
 if(visual||architectural)providers.push('museum','openLibrary','googleBooks');
 else if(literary||music)providers.push('openLibrary','googleBooks');
 else if(!science&&!medicine)providers.push('openLibrary');
 if((visual||architectural)&&!/\b(persona|author|autor|biografia|biography)\b/.test(q))providers.push('gettyAat');
 return {providers:[...new Set(providers)],intent:medicine?'medicine':science?'science':visual?'visual':architectural?'architecture':literary?'literature':music?'music':'general',
  note:'Consulta de fuentes externas según tema. Una respuesta de API no implica revisión académica ni exhaustividad de la web.'};
}
window.VitruviaWebRouting={plan,version:'20261111-source-aware-v1'};
})();
