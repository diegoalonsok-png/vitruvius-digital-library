/* Vitruvia academic source ordering (presentation only).
 * Never changes texts, editions, witnesses, links or source scores.
 * An encyclopedic source remains accessible, but documentary evidence
 * is shown first unless encyclopedia-only mode was explicitly selected.
 */
(()=>{"use strict";
 const academic=[
  "library","apparatus","manuscripts","editions","fragments",
  "universities","scholars","external-texts","encyclopedia","research"
 ];
 const semantic=["semantic",...academic];
 const encyclopedia=["encyclopedia",...academic.filter(x=>x!=="encyclopedia")];
 function groups(mode){
  return (mode==="wiki"?encyclopedia:mode==="ai"?semantic:academic).slice();
 }
 window.VitruviaAcademicOrder=Object.freeze({groups,version:"1.0"});
})();
