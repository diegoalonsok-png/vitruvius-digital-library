// Share a search configuration, never browser-local files or transient image data.
const choices={
  scope:new Set(['all','principal','recensio-es','recensio-fr','theory-en']),
  kind:new Set(['words','locus','count','semantic']),
  match:new Set(['words','phrase']),
  language:new Set(['all','la','es','fr','en']),
  count:new Set(['exact','prefix'])
};
export function readSearchState(params){
  const query=String(params.get('q')||'').trim().slice(0,2000);
  if(!query)return null;
  const state={query};
  for(const [key,allowed] of Object.entries(choices)){
    const value=params.get(key);if(allowed.has(value))state[key]=value;
  }
  const book=params.get('book'),chapter=params.get('chapter');
  if(/^(?:[1-9]|10)$/.test(book||''))state.book=book;
  if(chapter==='praef'||/^(?:[1-9]|1[0-6])$/.test(chapter||''))state.chapter=chapter;
  return state;
}
export function searchStateURL(currentURL,state){
  const url=new URL(currentURL),params=new URLSearchParams();
  const input=new URLSearchParams({q:state.query||''});
  for(const key of [...Object.keys(choices),'book','chapter'])if(state[key]!=null)input.set(key,String(state[key]));
  const validated=readSearchState(input);
  if(!validated)return null;
  params.set('q',validated.query);
  for(const [key,value] of Object.entries(validated))if(key!=='query')params.set(key,value);
  url.search=params.toString();
  // No navigation or redirect is encoded in a search link.
  url.hash='buscar';
  return url;
}
