const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trim=s=>String(s??'').trim().replace(/[.\s]+$/,'');
export function bookTitle(e){return e?.bibliographic_title||[e?.title,e?.subtitle].filter(Boolean).join(': ');}
export function bibliographyHTML(e,{includeISBN=true,includeURL=false}={}){
 if(!e)return '';
 let s=esc(e.bibliographic_author||e.author||'Diego Kurilo')+'. <em>'+esc(trim(bookTitle(e)))+'</em>. '+(e.edition_statement?esc(trim(e.edition_statement))+'. ':'')+esc(trim(e.publisher))+', '+esc(e.year)+'.';
 if(includeISBN&&e.isbn)s+=' ISBN '+esc(trim(e.isbn))+'.';
 if(includeURL&&(e.read_url||e.source_url))s+=' '+esc(e.read_url||e.source_url);
 return s;
}
export function bibliographyText(e,options={}){return bibliographyHTML(e,options).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
