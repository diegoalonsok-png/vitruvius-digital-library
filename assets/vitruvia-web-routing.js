/* Source-specific routing: fewer irrelevant requests, no paid search APIs.
   Source priority does not certify accuracy or peer review. */
(()=>{'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function plan(query,identity){
 const q=norm(query),desc=norm([identity?.description,identity?.authorityDescription,identity?.occupation].filter(Boolean).join(' '));
 const text=q+' '+desc;
 const contains=re=>re.test(text);
 const visual=contains(/\b(pintor|painter|painting|sculpt|escult|artista|visual|museum|museo|dali|leonardo|pintura|cuadro|arte|artwork|photograph|fotograf)\b/);
 const architectural=contains(/\b(arquitect|architect|edificio|building|urbanis|fachada|facade|monument|templo|temple)\b/);
 const medicine=contains(/\b(medic|medicinal|clinica|clinical|disease|enfermedad|epidemi|salud|biolog|virus|anatom|pharmac|vaccine)\b/);
 const science=contains(/\b(matematic|math|equation|ecuacion|ingenier|engineering|physics|fisic|formula|formulae|wind load|carga de viento|torsion|torsion|estatica|statics|mechanic|mecanica|algorithm|algoritmo)\b/);
 const literary=contains(/\b(literatur|escritor|writer|poet|poeta|novela|novel|libro|book|manuscrit|codice|codex|editorial|filolog|philolog|latin|latino|greek|griego)\b/);
 const music=contains(/\b(music|musica|compositor|composer|singer|cantante|album|disco|band|banda|song|cancion)\b/);
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
