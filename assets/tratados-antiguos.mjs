const $=id=>document.getElementById(id);
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const statusName={perdido:'Obra perdida',parcial:'Tradición parcialmente conservada',conservado:'Obra conservada'};
const embedById={
 frontinus:'https://archive.org/embed/twobooksonwater00hersgoog',
 faventinus:'https://archive.org/embed/vitruviidearchit00vitr_0',
 palladius:'https://archive.org/embed/opusagriculturae00pall'
};
let works=[];
function elt(tag,attrs={},content=''){
 const el=document.createElement(tag);
 for(const [name,value] of Object.entries(attrs)){if(name==='className')el.className=value;else if(name==='href'||name==='title'||name==='rel'||name==='target'||name==='type'||name==='id'||name==='loading')el.setAttribute(name,String(value));}
 if(content)el.textContent=content;return el;
}
function link(text,url){
 const a=elt('a',{href:url,target:'_blank',rel:'noopener noreferrer'},text);return a;
}
function resultCard(r){
 const article=elt('article',{className:'ancient-entry'});
 article.id=r.id;
 article.append(elt('p',{className:'ancient-meta'},r.period+' · '+statusName[r.status]+' · '+(r.group==='griego'?'Tradición griega':r.group==='romano'?'Roma republicana':r.group==='tecnico'?'Mecánica':r.group==='posterior'?'Imperio romano':'Antigüedad tardía')));
 article.append(elt('h3',{},r.title));
 article.append(elt('p',{},'Responsabilidad: '+r.author));
 article.append(elt('p',{},r.note));
 article.append(elt('p',{className:'ancient-meta'},'Referencia documental: '+r.reference));
 const actions=elt('div',{className:'ancient-actions'});
 if(r.url)actions.append(link('Fuente y testimonio ↗',r.url));
 if(r.pdf_url){
  actions.append(link(r.pdf_label||'Consultar PDF histórico ↗',r.pdf_url));
  if(embedById[r.id]){
   const container=elt('div'),button=elt('button',{type:'button'},'Leer edición histórica aquí');
   button.setAttribute('aria-expanded','false');
   button.addEventListener('click',()=>{
    const exists=container.querySelector('iframe');
    if(exists){exists.remove();button.setAttribute('aria-expanded','false');button.textContent='Leer edición histórica aquí';return;}
    const iframe=elt('iframe',{className:'ancient-iframe',loading:'lazy',title:'Visor de la edición histórica de '+r.author});
    iframe.src=embedById[r.id];container.append(iframe);
    button.setAttribute('aria-expanded','true');button.textContent='Cerrar visor histórico';
   });
   actions.append(button);article.append(actions,container);
  }else article.append(actions);
  if(r.pdf_note)article.append(elt('p',{className:'ancient-meta'},r.pdf_note));
 }else{
  article.append(actions);
  if(r.status==='perdido')article.append(elt('p',{className:'ancient-meta'},'No existe PDF de esta obra perdida. El enlace de fuente conduce al pasaje que atestigua su existencia.'));
 }
 return article;
}
function render(){
 const q=fold($('ancient-q').value.trim()),group=$('ancient-group').value,state=$('ancient-state').value,sort=$('ancient-sort').value;
 let visible=works.filter(r=>(!group||r.group===group)&&(!state||r.status===state)&&(!q||fold([r.author,r.title,r.period,r.note,r.reference,r.group,r.status].join(' ')).includes(q)));
 visible.sort((a,b)=>sort==='author'?a.author.localeCompare(b.author,'es'):a.sort-b.sort||a.author.localeCompare(b.author,'es'));
 $('ancient-count').textContent=visible.length+' de '+works.length+' fichas visibles · '+works.filter(r=>r.status==='perdido').length+' referencias a obras perdidas · '+works.filter(r=>r.status==='conservado').length+' obras conservadas.';
 const parent=$('ancient-results');parent.replaceChildren();
 if(!visible.length){parent.append(elt('p',{},'No hay coincidencias con estos filtros. Probá con otro término o dejá los filtros en «Todas».'));return;}
 const fragment=document.createDocumentFragment();
 for(const r of visible)fragment.append(resultCard(r));
 parent.append(fragment);
}
for(const id of ['ancient-q','ancient-group','ancient-state','ancient-sort'])$(id).addEventListener(id==='ancient-q'?'input':'change',render);
$('ancient-search').addEventListener('submit',event=>event.preventDefault());
try{
 const response=await fetch('data/tratados-antiguos.json?v=20261102-1');
 if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json();
 works=data.works||[];render();
}catch(error){$('ancient-count').textContent='No se pudo cargar la bibliografía: '+error.message+'. Recargá la página para intentar nuevamente.';}
