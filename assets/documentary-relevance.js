/* A bibliographic search hit is not subject evidence when it only matches an
 * author's forename. Filter catalogue metadata, retaining local documents and
 * results explicitly supplied by a full-text search provider. */
(()=>{'use strict';
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const ignored=new Set('de del la el los las un una unos unas y en por para sobre the of and for in on a an with from le les des du et sur dans'.split(' '));
const stem=w=>w.length>4?w.replace(/s$/,''):w;
const words=s=>fold(s).split(/\s+/).filter(w=>w.length>2&&!ignored.has(w)).map(stem);
const aliases={lucrecio:['lucretius','titus lucretius carus','tito lucrecio caro'],vitruvio:['vitruvius','marco vitruvio polion','marcus vitruvius pollio']};
function accepts(row,query){
  if(!['article','openlibrary','googlebook'].includes(row.type)||row.externalFulltext)return true;
  const wanted=words(query);if(!wanted.length)return true;
  // Only the title and substantive abstract are subject evidence. Journal,
  // publisher, DOI and author metadata cannot establish thematic relevance.
  const subject=words(row.title+' '+(row.abstract||''));
  const queryName=fold(query),author=fold(row.author);
  const names=new Set([queryName,...(aliases[queryName]||[])]);
  // This also permits an original work by the queried ancient author.
  if(names.has(author))return true;
  const title=' '+fold(row.title)+' ';
  const variantMatch=wanted.length===1&&(aliases[queryName]||[]).some(name=>title.includes(' '+name+' '));
  const overlap=wanted.filter(w=>subject.includes(w)).length;
  if(wanted.length===1)return overlap===1||variantMatch;
  return overlap>=Math.ceil(wanted.length*(wanted.length>5?.65:1));
}
window.VitruviaDocumentaryRelevance={accepts};
})();
