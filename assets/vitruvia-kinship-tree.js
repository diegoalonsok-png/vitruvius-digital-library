/* Vitruvia · documented family tree, not a lexical list.
 * Genealogical parent/child lines only connect Wikidata P22/P25/P40.
 * Spouses (P26), siblings (P3373) and political successors are distinct.
 */
(()=>{
 "use strict";
 const qid=x=>/^Q[1-9]\d*$/.test(String(x||""));
 const el=(name,cls,label)=>{const e=document.createElement(name);if(cls)e.className=cls;if(label!==undefined)e.textContent=String(label);return e};
 const locale=()=>["en","fr"].includes(document.documentElement.lang)?document.documentElement.lang:"es";
 const t=(es,en,fr)=>locale()==="en"?en:locale()==="fr"?fr:es;
 const pretty=(data,id)=>data?.[id]?.labels?.[locale()]?.value||data?.[id]?.labels?.es?.value||data?.[id]?.labels?.en?.value||data?.[id]?.labels?.fr?.value||id;
 const LINK="https://www.wikidata.org/wiki/";
 function render(section,groups,labels,subjectId,subjectName){
  if(!section||!qid(subjectId)||!Array.isArray(groups))return null;
  const byLabel=Object.fromEntries(groups.map(g=>[g.label,(g.ids||[]).filter(qid)]));
  const uniq=(ids)=>[...new Set(ids)].slice(0,12);
  const father=uniq(byLabel["Padre"]||[]),mother=uniq(byLabel["Madre"]||[]);
  const spouse=uniq(byLabel["Cónyuge"]||[]),children=uniq(byLabel["Descendencia"]||[]),siblings=uniq(byLabel["Hermanos/as"]||[]);
  if(!(father.length+mother.length+spouse.length+children.length+siblings.length))return null;
  const root=el("section","vkt-tree");root.setAttribute("aria-label",t("Árbol de parentesco documentado","Documented family tree","Arbre de parenté documenté"));
  const nav=el("div","vkt-nav");
  nav.append(el("h5",null,t("Árbol genealógico","Family tree","Arbre généalogique")));
  const controls=el("div","vkt-controls");
  const backward=el("button",null,"←"),forward=el("button",null,"→");
  for(const [button,label] of [[backward,t("Desplazar a la izquierda","Scroll left","Défiler à gauche")],[forward,t("Desplazar a la derecha","Scroll right","Défiler à droite")]]){
   button.type="button";button.setAttribute("aria-label",label);controls.append(button);
  }
  nav.append(controls);root.append(nav);
  const viewport=el("div","vkt-viewport");viewport.tabIndex=0;
  viewport.setAttribute("aria-label",t("Árbol horizontal desplazable por generaciones","Horizontally scrollable family generations","Générations de la famille, défilement horizontal"));
  const board=el("div","vkt-board");viewport.append(board);
  backward.onclick=()=>viewport.scrollBy({left:-280,behavior:"smooth"});
  forward.onclick=()=>viewport.scrollBy({left:280,behavior:"smooth"});
  viewport.addEventListener("keydown",e=>{
   if(e.target===viewport&&["ArrowLeft","ArrowRight"].includes(e.key)){
    e.preventDefault();viewport.scrollBy({left:e.key==="ArrowRight"?240:-240,behavior:"smooth"});
   }
  });
  const person=(id,relation,highlight=false)=>{
   const block=el("div","vkt-person"+(highlight?" vkt-focus":""));
   block.dataset.qid=id;
   block.append(el("small",null,relation));
   const link=el("a",null,id===subjectId?(subjectName||pretty(labels,id)):pretty(labels,id));
   link.href=LINK+id;link.target="_blank";link.rel="noopener noreferrer";
   link.title=t("Ver ficha y declaraciones de parentesco en Wikidata","Open Wikidata relationship record","Voir la notice Wikidata");
   block.append(link);return block;
  };
  const tier=(title,cls)=>{const row=el("div","vkt-tier "+cls);row.setAttribute("aria-label",title);return row};
  // Generation 1: evidence for mother and father of the focal subject.
  if(father.length||mother.length){
   const parents=tier(t("Progenitores","Parents","Parents"),"vkt-parents");
   const people=el("div","vkt-people");
   for(const id of father)people.append(person(id,t("Padre","Father","Père")));
   for(const id of mother)people.append(person(id,t("Madre","Mother","Mère")));
   parents.append(el("span","vkt-tier-caption",t("Generación anterior","Previous generation","Génération précédente")),people);
   board.append(parents);
  }
  // Focus generation: spouse relation is horizontal, not a child link.
  const focal=tier(t("Persona consultada y vínculos","Focus and relationships","Personne étudiée et relations"),"vkt-generation");
  focal.append(el("span","vkt-tier-caption",t("Generación consultada","Focus generation","Génération étudiée")));
  const central=el("div","vkt-focus-row");
  central.append(person(subjectId,t("Persona consultada","Subject","Personne étudiée"),true));
  if(spouse.length){
   const partners=el("div","vkt-spouse-block");
   partners.append(el("small","vkt-relation-note",t("Uniones registradas (no se atribuye progenitura)","Recorded spouses (no inferred parenthood)","Conjoints (sans filiation supposée)")));
   for(const id of spouse)partners.append(person(id,t("Cónyuge","Spouse","Conjoint")));
   central.append(partners);
  }
  focal.append(central);board.append(focal);
  // The child branch hangs only from the subject; spouses are not presumed
  // to be the other parent of any child.
  if(children.length){
   const descendants=tier(t("Descendencia","Children","Descendance"),"vkt-children");
   descendants.append(el("span","vkt-tier-caption",t("Generación siguiente","Next generation","Génération suivante")));
   const people=el("div","vkt-people");
   for(const id of children)people.append(person(id,t("Hijo/a","Child","Enfant")));
   descendants.append(people);board.append(descendants);
  }
  // A sibling record does NOT establish that every sibling has the two
  // parent records shown above; keep it on a separate unconnected branch.
  if(siblings.length){
   const siblingGroup=el("section","vkt-siblings");
   siblingGroup.append(el("h6",null,t("Hermanos documentados · rama no inferida","Documented siblings · separate evidence","Fratrie documentée · relation indépendante")));
   const people=el("div","vkt-people");
   for(const id of siblings)people.append(person(id,t("Hermano/a","Sibling","Frère ou sœur")));
   siblingGroup.append(people);board.append(siblingGroup);
  }
  root.append(viewport);
  root.append(el("p","vkt-caveat",t(
   "Líneas continuas: relaciones directas registradas en Wikidata (P22/P25/P40). Cónyuges y hermanos se muestran aparte; la sucesión política NO se deduce del parentesco. Una ficha de autoridad requiere cotejo historiográfico.",
   "Solid lines indicate Wikidata statements for parents/children (P22/P25/P40). Spouses and siblings are separate; political succession is NOT inferred from kinship. Authority records require historical verification.",
   "Traits pleins : parents/enfants attestés dans Wikidata (P22/P25/P40). Conjoints et fratrie restent distincts ; aucune succession politique n'est déduite.")));
  section.append(root);return root;
 }
 window.VitruviaKinshipTree={render,version:"1.0-generational-branches"};
})();
