/* Asiriología: parentescos documentados y fuentes de investigación cuneiforme.
 * Sin genealogías inventadas, inferencias automáticas de ascendencia ni CSS nuevo.
 * Los vínculos Wikidata son fichas de autoridad, NO citas académicas revisadas.
 */
(()=>{'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const isMesopotamian=(row,q)=>{
 const d=norm([row?.entityDescription,row?.entityCanonical,row?.excerpt,row?.title,row?.meta].join(' '));
 const query=norm(q);
 return /\b(assyrian|assyriology|babylonian|babylonia|mesopotamia|mesopotamian|akkadian|sumerian|asirio|asiria|babilonia|babilonico|babilonico|babilonico|sumerio|acadio|asirios|cuneiforme)\b/.test(d)||
 /\b(asiria|assyria|assur|ashur|asir|babilon|babylon|mesopotam|sumer|acadi|akkad|ninive|nineveh|uruk|ur-nammu|hammurabi|sargon|senaquerib|sennacherib|assurbanipal|ashurbanipal|nabucodonosor|nebuchadnezzar|gilgamesh|gilgames)\b/.test(query);
};
const SOURCES=[
 ['Oracc · corpus cuneiforme anotado','https://oracc.museum.upenn.edu/','Ediciones y anotaciones de textos cuneiformes'],
 ['CDLI · Cuneiform Digital Library Initiative','https://www.cdli.earth/','Tablillas, signaturas, fotografías y metadatos'],
 ['Oxford · ETCSL','https://etcsl.orinst.ox.ac.uk/','Textos sumerios, transliteración y traducción; corpus histórico'],
 ['Cambridge · recursos mesopotámicos','https://www.arch.cam.ac.uk/node/1805','Directorio de corpus y recursos asiriológicos']
];
const properties=[['P22','Padre'],['P25','Madre'],['P26','Cónyuge'],['P40','Descendencia'],['P3373','Hermanos/as']];
const getClaims=(j,p)=>((j?.claims||{})[p]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value?.id).filter(id=>/^Q\d+$/.test(id)).slice(0,12);
const node=(tag,value)=>{const n=document.createElement(tag);if(value)n.textContent=value;return n};
const link=(href,label)=>{const a=node('a',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a};

/* El árbol replica las ramas tipográficas de Lexicon solo dentro del dossier.
 * Relaciones sin declaración no se dibujan. La sucesión política NO equivale
 * automáticamente a filiación, por lo que no se infiere de una lista de reyes. */
function dynastyTree(section,groups,labels,subjectId,subjectName){
 const byProp=Object.fromEntries(groups.map(g=>[g.label,g.ids]));
 const display=id=>labels[id]?.labels?.es?.value||labels[id]?.labels?.en?.value||id;
 const tree=node('div');tree.className='vitruvia-dynasty-tree';
 const roots=node('ul');roots.className='lx-tree-list';
 function leaf(ul,label,id,name,children){
  const li=node('li');li.className='lx-tree-node';
  const head=node('span');head.className='lx-tree-head';
  head.append(node('small',label));head.append(link('https://www.wikidata.org/wiki/'+id,name));
  li.append(head);if(children?.length){const nested=node('ul');nested.className='lx-tree-list';children.forEach(c=>nested.append(c));li.append(nested)}
  ul.append(li);return li;
 }
 const parents=[...(byProp['Padre']||[]),...(byProp['Madre']||[])];
 const siblings=byProp['Hermanos/as']||[];
 const spouses=byProp['Cónyuge']||[];
 const children=byProp['Descendencia']||[];
 const center=node('li');center.className='lx-tree-node';
 const centerHead=node('span');centerHead.className='lx-tree-head';
 centerHead.append(node('strong',subjectName||subjectId));center.append(centerHead);
 const branch=node('ul');branch.className='lx-tree-list';
 for(const id of spouses)leaf(branch,'Cónyuge · ',id,display(id));
 for(const id of siblings)leaf(branch,'Hermano/a · ',id,display(id));
 for(const id of children)leaf(branch,'Hijo/a · ',id,display(id));
 if(branch.childNodes.length)center.append(branch);
 if(parents.length){
  for(const [i,id] of parents.entries()){
   const li=node('li');li.className='lx-tree-node';
   const h=node('span');h.className='lx-tree-head';h.append(node('small',i===0?'Progenitor/a · ':'Progenitor/a · '),link('https://www.wikidata.org/wiki/'+id,display(id)));li.append(h);
   const chain=node('ul');chain.className='lx-tree-list';
   // El sujeto se anida una sola vez: dos padres no implican dos árboles
   // duplicados ni una filiación exclusiva.
   if(i===0)chain.append(center);
   if(chain.childNodes.length)li.append(chain);
   roots.append(li);
  }
 }else roots.append(center);
 tree.append(roots);
 const styleId='vitruvia-dynasty-tree-style';
 if(!document.getElementById(styleId)){
  const style=node('style');style.id=styleId;
  style.textContent='.vitruvia-dynasty-tree .lx-tree-list{list-style:none;margin:10px 0 14px;padding:0 0 0 18px;border-left:2px solid #4a4a4a}.vitruvia-dynasty-tree .lx-tree-node{position:relative;margin:0 0 4px;padding:8px 0 4px 14px}.vitruvia-dynasty-tree .lx-tree-node:before{content:"";position:absolute;left:-19px;top:20px;width:24px;border-top:2px solid #4a4a4a}.vitruvia-dynasty-tree .lx-tree-head{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:baseline;padding:7px 12px;border:1px solid #383838;border-radius:8px}.vitruvia-dynasty-tree .lx-tree-head small{font:11px Arial,sans-serif;opacity:.75}.vitruvia-dynasty-tree a{color:inherit;text-decoration:underline;text-underline-offset:3px}';
  document.head.append(style);
 }
 section.append(tree);return tree;
}
let serial=0;
async function fetchEntity(qid){
 const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:qid,props:'claims|labels|descriptions',languages:'es|en|fr',format:'json',origin:'*'});
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
 try{const r=await fetch(url,{signal:ctl.signal});if(!r.ok)throw Error('HTTP '+r.status);return (await r.json())?.entities?.[qid]||null}
 finally{clearTimeout(timer)}
}
async function paint(query,rows){
 const current=++serial;
 const body=document.getElementById('article-body');if(!body)return;
 body.querySelector('#vitruvia-mesopotamia-research')?.remove();
 const identified=(rows||[]).find(r=>r?.wikidataId&&r?.preferredWiki&&isMesopotamian(r,query));
 if(!identified)return;
 const block=node('section');block.id='vitruvia-mesopotamia-research';block.className='article-author-reading';
 block.append(node('h3','Asiriología · filiación y fuentes de investigación'));
 const explanation=node('p','Las relaciones provienen de registros de autoridad; confirmar filiación y sucesión con tablillas, crónicas reales y estudios asiriológicos especializados.');
 explanation.className='article-note';block.append(explanation);
 const sourceList=node('ul');
 for(const [name,url,detail] of SOURCES){const li=node('li');li.append(link(url,name),document.createTextNode(' · '+detail));sourceList.append(li)}
 const root=node('div');root.append(node('h4','Corpus y centros de investigación'),sourceList);
 block.append(root);body.append(block);
 let entity;
 try{entity=await fetchEntity(identified.wikidataId)}catch{return}
 if(current!==serial||!block.isConnected||!entity)return;
 const groups=properties.map(([property,label])=>({label,ids:[...new Set(getClaims(entity,property))]})).filter(x=>x.ids.length);
 if(!groups.length)return;
 const ids=[...new Set(groups.flatMap(x=>x.ids))].slice(0,40);
 let labels={};
 try{
  const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),props:'labels',languages:'es|en|fr',format:'json',origin:'*'});
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
  try{const r=await fetch(url,{signal:ctl.signal});if(r.ok)labels=(await r.json()).entities||{}}finally{clearTimeout(timer)}
 }catch{}
 if(current!==serial||!block.isConnected)return;
 const section=node('div');section.append(node('h4','Árbol de parentescos documentados'));
 dynastyTree(section,groups,labels,identified.wikidataId,identified.entityCanonical||identified.title||query);
 section.append(link('https://www.wikidata.org/wiki/'+identified.wikidataId,'Consultar las declaraciones y referencias del registro de autoridad'));
 block.insertBefore(section,root);
}
window.addEventListener('vitruvia:search',()=>{serial++;document.getElementById('vitruvia-mesopotamia-research')?.remove()});
window.addEventListener('vitruvia:results',event=>{const d=event.detail||{};void paint(d.query||'',d.rows||[])});
window.VitruviaMesopotamiaResearch={isMesopotamian,SOURCES,properties};
})();