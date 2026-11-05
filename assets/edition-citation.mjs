const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trim=s=>String(s??'').trim().replace(/[.\s]+$/,'');
export function bookTitle(e){return e?.bibliographic_title||[e?.title,e?.subtitle].filter(Boolean).join(': ');}
export function bibliographyHTML(e,{includeISBN=true,includeURL=false}={}){
 if(!e)return '';
 const who=String(e.bibliographic_author||e.author||'Kurilo, Diego');
 const role=who.match(/^(?:Vitruvio;\s*)?(.+?)\s*\((editor|traductor)\)$/i);
 if(role){const pub=trim(e.publisher).replace(/^(.+),\s*(Madrid|Como|Leipzig|Venecia|Roma|París|Londres)$/,'$2: $1');let s='Vitruvio. <em>'+esc(trim(e.title))+'</em>. '+(role[2].toLowerCase()==='editor'?'Editado por ':'Traducido por ')+esc(role[1])+'. '+esc(pub)+', '+esc(e.year)+'.';if(e.doi)s+=' https://doi.org/'+esc(trim(e.doi))+'.';return s}
 const name=who==='Diego Kurilo'?'Kurilo, Diego':who;
 let s=esc(name)+(name.endsWith('.')?' ':'. ')+'<em>'+esc(trim(bookTitle(e)))+'</em>. '+(e.edition_statement?esc(trim(e.edition_statement))+'. ':'')+esc(trim(e.publisher))+', '+esc(e.year)+'.';
 // Chicago 18: el DOI forma parte de la cita; el ISBN va después como identificador del libro.
 if(e.doi)s+=' https://doi.org/'+esc(trim(e.doi).replace(/^https?:\/\/doi\.org\//,''))+'.';
 if(includeISBN&&e.isbn)s+=' ISBN '+esc(trim(e.isbn))+'.';
 if(includeURL&&(e.read_url||e.source_url))s+=' '+esc(e.read_url||e.source_url);
 return s;
}
export function bibliographyText(e,options={}){return bibliographyHTML(e,options).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
