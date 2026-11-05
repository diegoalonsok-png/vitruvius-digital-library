/* VITRUVIA · contextual academic panel. Sources are verifiable records, never invented citations. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const panel=$('vitruvia-context');
if(!panel)return;
const txt={
 es:{title:'Obras y contexto cultural',origin:'Origen y sentido del término',loci:'Vitruvio · pasajes documentados',sources:'Bibliografía y estudios',external:'Explorar por universidad',noLoci:'No hay coincidencias literales verificadas en las ediciones estructuradas disponibles.',noSources:'Los resultados todavía no aportan un ISBN o DOI verificable para esta búsqueda.',loading:'Consultando textos y registros…',caution:'El panel distingue citas textuales de relaciones conceptuales. No atribuye a Vitruvio conceptos que no figuran en el pasaje.',modern:'Concepto general y fuentes externas',site:'Consulta externa en',notice:'Los enlaces institucionales son búsquedas, no avales ni obras verificadas.',etymology:'Para confirmar la etimología'},
 en:{title:'Works and cultural context',origin:'Origin and meaning of the term',loci:'Vitruvius · documented passages',sources:'Bibliography and scholarship',external:'Explore by university',noLoci:'No verified literal matches in the available structured editions.',noSources:'The results do not yet provide a verifiable ISBN or DOI for this query.',loading:'Reading texts and records…',caution:'The panel distinguishes textual quotations from conceptual associations. It does not attribute undocumented ideas to Vitruvius.',modern:'General context and external sources',site:'External search at',notice:'University links are searches, not endorsements or verified publications.',etymology:'To verify the etymology'},
 fr:{title:'Œuvres et contexte culturel',origin:'Origine et sens du terme',loci:'Vitruve · passages documentés',sources:'Bibliographie et études',external:'Explorer par université',noLoci:'Aucune occurrence littérale vérifiée dans les éditions structurées disponibles.',noSources:'Les résultats ne fournissent pas encore d’ISBN ou de DOI vérifiable pour cette recherche.',loading:'Consultation des textes et des notices…',caution:'Le panneau distingue les citations textuelles des associations conceptuelles et n’attribue pas à Vitruve des idées absentes des passages.',modern:'Contexte général et sources externes',site:'Recherche externe sur',notice:'Ces liens sont des recherches, non des recommandations institutionnelles.',etymology:'Pour vérifier l’étymologie'}
};
const note={
 'symmetria':{latin:['symmetr'],greek:'συμμετρία', preferred:['1.2.4','3.1.1','1.2.2','1.2.1'],
  es:'Del griego συμμετρία, «conmensurabilidad» o correspondencia de medidas. Vitruvio la entiende como la relación proporcional de las partes con el conjunto, según una unidad de medida; no equivale simplemente a la simetría especular moderna.',
  en:'From Greek συμμετρία, commensurability or correspondence of measures. For Vitruvius it concerns the proportional relation of parts to a whole according to a unit of measure, rather than modern mirror symmetry.',
  fr:'Du grec συμμετρία, « commensurabilité » ou correspondance des mesures. Chez Vitruve, elle concerne les rapports proportionnels des parties avec le tout, selon une unité de mesure, et non seulement la symétrie axiale moderne.'},
 'edad media':{general:true,
  es:'«Edad Media» es una denominación retrospectiva de la historiografía europea: la etapa situada entre la Antigüedad y la Edad Moderna. El rótulo procede de expresiones latinas eruditas como medium aevum («edad intermedia») y se difundió después de la época que designa. Sus límites cronológicos y su utilidad para historias no europeas son objeto de debate.',
  en:'“Middle Ages” is a retrospective European period label for the era between Antiquity and the Modern Age. It draws on learned Latin expressions such as medium aevum (“middle age”) and became established after the period itself. Its dates and applicability outside Europe remain debated.',
  fr:'« Moyen Âge » est une périodisation rétrospective européenne entre l’Antiquité et les Temps modernes. Le nom dérive de formules latines savantes comme medium aevum (« âge intermédiaire »), diffusées après la période. Ses limites et son application hors d’Europe sont discutées.'},
 'eurythmia':{latin:['eurythm'],greek:'εὐρυθμία',preferred:['1.2.3','1.2.1'],
  es:'Del griego εὐρυθμία: buen ritmo o disposición armoniosa. Vitruvio describe la euritmia como el aspecto agradable de las relaciones entre las dimensiones de los miembros de una obra.',
  en:'From Greek εὐρυθμία: good rhythm or harmonious arrangement. Vitruvius applies it to pleasing dimensional relationships in the parts of a building.',
  fr:'Du grec εὐρυθμία : rythme juste ou disposition harmonieuse. Chez Vitruve, l’eurythmie désigne l’aspect agréable des rapports dimensionnels entre les parties.'},
 'proportio':{latin:['proportio','proportion'],greek:'ἀναλογία',preferred:['3.1.1','1.2.2'],
  es:'En el latín técnico de Vitruvio, proportio expresa la relación mensurable entre partes y totalidad; el autor la vincula expresamente con el griego ἀναλογία.',
  en:'In Vitruvius’ technical Latin, proportio indicates a measurable relationship of parts and whole; he expressly connects it with Greek ἀναλογία.',
  fr:'Dans le latin technique de Vitruve, proportio exprime le rapport mesurable entre parties et totalité ; l’auteur l’associe au grec ἀναλογία.'},
 'ordinatio':{latin:['ordinatio','ordination'],greek:'τάξις',preferred:['1.2.1','1.2.2'],
  es:'Ordinatio es uno de los principios arquitectónicos de Vitruvio, asociado con el griego τάξις: organización dimensional y proporcionada de la obra.',
  en:'Ordinatio is an architectural principle in Vitruvius, associated with Greek τάξις: measured and proportionate ordering of a work.',
  fr:'Ordinatio est un principe architectural de Vitruve, associé au grec τάξις : organisation mesurée et proportionnée de l’ouvrage.'},
 'dispositio':{latin:['dispositio','disposition'],greek:'διάθεσις',preferred:['1.2.1'],
  es:'Dispositio designa la disposición de los elementos del proyecto; Vitruvio la vincula con el griego διάθεσις.',
  en:'Dispositio refers to the arrangement of elements in a design; Vitruvius relates it to Greek διάθεσις.',
  fr:'Dispositio renvoie à la disposition des éléments du projet ; Vitruve la rapproche du grec διάθεσις.'},
 'decor':{latin:['decor','decore','decoris'],preferred:['1.2.1'],
  es:'En Vitruvio, decor expresa adecuación o conveniencia arquitectónica al uso, al lugar y a la tradición; no es sinónimo exclusivo de ornamentación moderna.',
  en:'For Vitruvius, decor means architectural propriety or suitability to function, place and convention, not merely modern decoration.',
  fr:'Chez Vitruve, decor signifie convenance architecturale selon l’usage, le lieu et la tradition, et non simple décoration.'},
 'firmitas':{latin:['firmitat','firmitas'],es:'Firmitas es la solidez o resistencia de una construcción en la tradición vitruviana.',en:'Firmitas denotes the solidity or durability of a building in the Vitruvian tradition.',fr:'Firmitas désigne la solidité ou la durabilité d’une construction dans la tradition vitruvienne.'},
 'utilitas':{latin:['utilitat','utilitas'],es:'Utilitas alude a la conveniencia y funcionalidad de la distribución de los edificios.',en:'Utilitas refers to the suitability and practical function of architectural arrangements.',fr:'Utilitas se rapporte à la convenance et à l’usage pratique des dispositions architecturales.'},
 'venustas':{latin:['venustat','venustas'],es:'Venustas expresa la belleza de la obra arquitectónica en la tradición vitruviana.',en:'Venustas concerns architectural beauty in the Vitruvian tradition.',fr:'Venustas concerne la beauté architecturale dans la tradition vitruvienne.'}
};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const link=(text,url)=>{const a=mk('a',null,text);a.href=url;a.rel='noopener noreferrer';a.target='_blank';return a};
const lang=()=>['es','en','fr'].includes(document.documentElement.lang)?document.documentElement.lang:'es';
const dict=()=>txt[lang()];
const termFor=q=>{
 const n=norm(q);
 const aliases={'simetria':'symmetria','simetría':'symmetria','symmetry':'symmetria','symmetrie':'symmetria','proporcion':'proportio','proporción':'proportio','proportion':'proportio','euritmia':'eurythmia','euritmiae':'eurythmia','ordenacion':'ordinatio','ordenación':'ordinatio','disposicion':'dispositio','disposición':'dispositio','medieval':'edad media','middle ages':'edad media','moyen age':'edad media','medioevo':'edad media'};
 const key=aliases[n]||n;
 return {key,entry:note[key]||null};
};
const highlight=(target,text,needle)=>{
 const t=String(text||'');
 const search=String(needle||'');
 if(!search||!t){target.textContent=t;return}
 let last=0;const lower=t.toLocaleLowerCase(),find=search.toLocaleLowerCase();
 while(true){const i=lower.indexOf(find,last);if(i<0)break;let end=i+search.length;while(end<t.length&&/[\p{L}\p{M}]/u.test(t[end]))end++;target.append(document.createTextNode(t.slice(last,i)),mk('mark','context-match',t.slice(i,end)));last=end;if(last>=t.length)break;}
 target.append(document.createTextNode(t.slice(last)));
};
let lastQuery='',currentRows=[],requestId=0,expandedBibliography=false;
function frame(query){
 panel.replaceChildren();
 const d=dict();
 panel.append(mk('p','context-kicker','VITRUVIA · ' + d.title.toUpperCase()));
 panel.append(mk('h3','context-term',query));
 panel.hidden=false;
}
function heading(text){const h=mk('h4','context-section-title',text);panel.append(h);return h}
function origin(query){
 const d=dict(),{entry}=termFor(query);
 heading(d.origin);
 if(entry){
  if(entry.greek)panel.append(mk('div','context-greek',entry.greek));
  panel.append(mk('p','context-note',entry[lang()]||entry.es));
 }else{
  const wiki=currentRows.find(x=>x.type==='wikipedia'&&x.link&&(norm(x.title)===norm(query)||norm(x.title).includes(norm(query))))||currentRows.find(x=>x.type==='wikipedia'&&x.link&&norm(x.title).includes(norm(query).split(' ')[0]));
  if(wiki){
   panel.append(mk('p','context-note',String(wiki.fullExtract||wiki.excerpt||'').replace(/\s+/g,' ').slice(0,320)+(String(wiki.fullExtract||wiki.excerpt||'').length>320?'…':'')));
   panel.append(link('Wikipedia · '+wiki.title+' ↗',wiki.link));
  }else panel.append(mk('p','context-note',lang()==='es'?'El sentido histórico y la etimología deben comprobarse en fuentes específicas; no se atribuye un origen sin documentación.':lang()==='en'?'The historical sense and etymology require specific evidence; no undocumented origin is asserted.':'Le sens historique et l’étymologie exigent des sources précises ; aucune origine non documentée n’est affirmée.'));
 }
 if(!entry||entry.general){
   const p=new URLSearchParams({search:query});
   const a=link(d.etymology+' · Wikcionario ↗','https://es.wiktionary.org/w/index.php?'+p.toString());a.className='context-minor-link';panel.append(a);
 }
}
function isGreek(query){return /[\u0370-\u03ff\u1f00-\u1fff]/u.test(query)}
function lexicalNeedles(query){
 const {entry}=termFor(query);
 if(entry?.general)return [];
 if(entry?.latin)return entry.latin;
 if(isGreek(query))return [query];
 // Other searches retain their normal results; only seek literal excerpts for plausible original-language terms.
 if(/^[A-Za-z]{4,22}$/.test(query)&&!/^(cafe|coffee|coche|auto|carro|sarten|historia|music|museo|arte|templo|pintura|calle|escuela|mundo)$/i.test(query))return [query];
 return [];
}
async function loci(query,token){
 const d=dict(),{entry}=termFor(query),needles=lexicalNeedles(query);
 if(!needles.length)return;
 const explicit=!!entry?.latin||isGreek(query);
 const headingEl=heading(d.loci);
 const slot=mk('div','context-loci');panel.append(slot);
 if(!explicit){headingEl.hidden=true;slot.hidden=true}
 slot.append(mk('p','context-pending',d.loading));
 try{
  const corpus=await window.VitruviaResearchEngine?.getCorpora?.();
  if(token!==requestId)return;
  slot.replaceChildren();
  if(!Array.isArray(corpus)){if(!explicit){slot.remove();headingEl.remove()}else slot.append(mk('p','context-note',d.noLoci));return}
  const usable=corpus.filter(x=>x?.latin&&x.locus);
  const byEdition=lang()==='en'?'theory-en':lang()==='fr'?'recensio-fr':'recensio-es';
  const chosen=usable.some(x=>x.edition===byEdition)?byEdition:'recensio-es';
  const hits=usable.filter(x=>x.edition===chosen).map(p=>{
    const low=String(p.latin).toLocaleLowerCase();
    const found=needles.map(n=>({term:n,index:low.indexOf(n.toLocaleLowerCase())})).filter(x=>x.index>=0).sort((a,b)=>a.index-b.index)[0];
    return found?{p,found}:null;
  }).filter(Boolean);
  const ordered=hits.sort((a,b)=>{
   const pa=entry?.preferred?.indexOf(a.p.locus)??-1,pb=entry?.preferred?.indexOf(b.p.locus)??-1;
   const rank=n=>n<0?999:n;
   return rank(pa)-rank(pb)||String(a.p.locus).localeCompare(String(b.p.locus),undefined,{numeric:true});
  }).slice(0,4);
  if(!ordered.length){if(!explicit){slot.remove();headingEl.remove()}else slot.append(mk('p','context-note',d.noLoci));return}
  headingEl.hidden=false;slot.hidden=false;
  for(const {p,found} of ordered){
   const item=mk('div','context-locus');
   const href='lector-bilingue.html?'+new URLSearchParams({edition:p.edition,locus:p.locus});
   item.append(link('De architectura · '+p.locus+' ↗',href));
   const i=found.index;
   const begin=Math.max(0,i-65),end=Math.min(p.latin.length,i+240);
   const quote=(begin?'…':'')+p.latin.slice(begin,end)+(end<p.latin.length?'…':'');
   const text=mk('p','context-latin');
   highlight(text,quote,found.term);
   item.append(text);
   if(p.translation)item.append(mk('p','context-translation',String(p.translation).slice(0,215)+(p.translation.length>215?'…':'')));
   slot.append(item);
  }
  slot.append(mk('p','context-disclaimer',d.caution));
 }catch(e){
   if(token!==requestId)return;
   if(!explicit){slot.remove();headingEl.remove()}else slot.replaceChildren(mk('p','context-note',d.noLoci));
 }
}
function bibliography(query){
 const d=dict();heading(d.sources);
 const related=(row)=>{
  const q=norm(query),title=norm(row.title),summary=norm([row.excerpt,row.journal,row.publisher].join(' '));
  const targets=termFor(query).key==='edad media'?['edad media','medieval','middle ages','middle age','moyen age','medioevo']:termFor(query).key==='symmetria'?['symmetria','symmetry','simetria','vitruvius','vitruvio','proportion']:[q];
  return targets.some(x=>title.includes(x))||q.split(' ').filter(x=>x.length>3).every(x=>title.includes(x))||targets.some(x=>x.length>5&&summary.includes(x)&&title.includes(x.split(' ')[0]));
 };
 const validDOI=doi=>typeof doi==='string'&&/^10\.\d{4,9}\/\S+$/.test(doi);
 const validISBN=isbn=>typeof isbn==='string'&&/^\d{10}(\d{3})?$/.test(isbn.replace(/[-\s]/g,''));
 const records=currentRows.filter(row=>row.link&&['googlebook','article','openlibrary','book','edition'].includes(row.type)&&related(row)&&(validDOI(row.doi)||validISBN(row.isbn)));
 const unique=new Set(),books=[];
 for(const row of records){
  const key=row.doi||row.isbn||norm(row.title);
  if(unique.has(key))continue;
  unique.add(key);books.push(row);
 }
 const list=mk('div','context-bibliography-list');panel.append(list);
 if(!books.length){list.append(mk('p','context-note',d.noSources));return}
 const total=books.length,initial=9,limit=expandedBibliography?total:initial;
 list.append(mk('p','context-bibliography-count',
   lang()==='en'?Math.min(limit,total)+' of '+total+' documented references':
   lang()==='fr'?Math.min(limit,total)+' sur '+total+' références documentées':
   Math.min(limit,total)+' de '+total+' referencias documentadas'));
 for(const row of books.slice(0,limit)){
  const item=mk('div','context-bibliography-item');
  const name=link(String(row.title||'')+' ↗',row.link);name.className='context-biblio-title';item.append(name);
  const author=String(row.author||'').trim(),publisher=String(row.publisher||'').trim(),journal=String(row.journal||'').trim();
  if(author)item.append(mk('p','context-biblio-meta',author));
  const publication=[journal||(norm(publisher)!==norm(author)?publisher:''),row.year].filter(Boolean).join(' · ');
  if(publication)item.append(mk('p','context-biblio-meta',publication));
  const source=[row.source,row.recordKind].filter(Boolean).join(' · ');
  if(source)item.append(mk('p','context-biblio-source',source));
  if(validDOI(row.doi))item.append(mk('span','context-identifier','DOI: '+row.doi));
  if(validISBN(row.isbn))item.append(mk('span','context-identifier','ISBN: '+row.isbn));
  list.append(item);
 }
 if(total>initial){
  const button=mk('button','context-biblio-more');
  button.type='button';
  button.textContent=expandedBibliography?
   (lang()==='en'?'Show fewer references':lang()==='fr'?'Afficher moins de références':'Mostrar menos referencias'):
   (lang()==='en'?'Show all '+total+' references':lang()==='fr'?'Afficher les '+total+' références':'Mostrar las '+total+' referencias');
  button.setAttribute('aria-expanded',String(expandedBibliography));
  button.addEventListener('click',()=>{expandedBibliography=!expandedBibliography;redraw(true)});
  list.append(button);
 }
}
function universityLinks(query){
 const d=dict();heading(d.external);
 const universities=[['Yale','yale.edu'],['Cambridge','cam.ac.uk'],['Harvard','harvard.edu'],['UBA','uba.ar']];
 const area=mk('div','context-universities');
 for(const [name,domain] of universities){
  const url='https://www.google.com/search?'+new URLSearchParams({q:'site:'+domain+' '+query+' research OR publication'});
  area.append(link(name+' ↗',url));
 }
 panel.append(area,mk('p','context-disclaimer',d.notice));
}
function redraw(keepPosition=true){
 if(!lastQuery){panel.hidden=true;return}
 const scroll=keepPosition?panel.scrollTop:0;
 const token=++requestId;
 frame(lastQuery);
 // The subject's own creations lead the right-hand panel in every discipline.
 window.VitruviaWebDossier?.render(panel,lastQuery,currentRows,()=>token===requestId);
 origin(lastQuery);
 const lexical=lexicalNeedles(lastQuery);
 if(lexical.length)void loci(lastQuery,token);
 bibliography(lastQuery);universityLinks(lastQuery);
 if(keepPosition)requestAnimationFrame(()=>{if(token===requestId)panel.scrollTop=scroll});
 else panel.scrollTop=0;
}
window.addEventListener('vitruvia:search',e=>{
 const next=String(e.detail?.query||'').trim();if(norm(next)!==norm(lastQuery))expandedBibliography=false;lastQuery=next;currentRows=[];redraw(false);
});
window.addEventListener('vitruvia:results',e=>{
 const q=String(e.detail?.query||'').trim();
 // Recover a missed initial search event when a cached search starts first.
 if(q&&!lastQuery&&norm(q)===norm($('query')?.value)){lastQuery=q;expandedBibliography=false}
 if(!q||norm(q)!==norm(lastQuery))return;
 currentRows=Array.isArray(e.detail.rows)?e.detail.rows:[];
 redraw();
});
window.addEventListener('vitruvia:entity',e=>{if(lastQuery&&[e.detail?.query,e.detail?.corrected].some(q=>q&&norm(q)===norm(lastQuery)))redraw()});
window.addEventListener('vitruvia:clear',()=>{lastQuery='';currentRows=[];expandedBibliography=false;requestId++;panel.hidden=true;panel.replaceChildren();panel.scrollTop=0});
new MutationObserver(records=>{if(records.some(r=>r.attributeName==='lang')&&lastQuery)redraw()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
// Deferred modules may finish downloading after the first results. Replay only
// the current in-memory search; nothing is stored across sessions.
const initial=window.VitruviaSearchSnapshot;
if(initial?.query){lastQuery=String(initial.query).trim();currentRows=Array.isArray(initial.rows)?initial.rows:[];redraw(false)}
})();
