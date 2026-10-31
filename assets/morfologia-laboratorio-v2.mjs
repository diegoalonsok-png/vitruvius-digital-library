const $=s=>document.querySelector(s);
const families={
 machina:['machina','machinae','machinam','machinarum','machinis','machinas','machinarum','machinaque'],
 dispositio:['dispositio','dispositionis','dispositionem','dispositione','dispositiones','dispositionum','dispositionibus'],
 architectura:['architectura','architecturae','architecturam','architecturarum','architecturis','architecturas'],
 symmetria:['symmetria','symmetriae','symmetriam','symmetriarum','symmetriis','symmetrias'],
 locus:['locus','loci','loco','locum','locorum','locis','locos','loca','locorum','locis']
};
let passages=[],allForms=new Set(),visible=0,currentMatches=[],currentForms=new Set();
const norm=s=>String(s).toLocaleLowerCase('la').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/æ/g,'ae').replace(/œ/g,'oe');
const rex=/[\p{L}\p{M}]+/gu;
function highlight(text,parent){let last=0;for(const m of text.matchAll(new RegExp(rex.source,'gu'))){if(!currentForms.has(norm(m[0])))continue;parent.append(document.createTextNode(text.slice(last,m.index)));const mark=document.createElement('mark');mark.className='hit-latin';mark.style.setProperty('background-color','#ffe100','important');mark.style.setProperty('color','#111b29','important');mark.style.setProperty('font-weight','700');mark.textContent=m[0];parent.append(mark);last=m.index+m[0].length;}parent.append(document.createTextNode(text.slice(last)));}
function showMore(){const end=Math.min(visible+40,currentMatches.length);for(const {p,n} of currentMatches.slice(visible,end)){const a=document.createElement('article'),h=document.createElement('strong'),paragraph=document.createElement('p');h.textContent=p.locus+' · '+n+' coincidencia(s)';highlight(p.latin||'',paragraph);a.append(h,paragraph);$('#hits').append(a);}visible=end;let b=$('#more');if(b)b.remove();if(visible<currentMatches.length){b=document.createElement('button');b.id='more';b.type='button';b.textContent='Ver 40 pasajes más ('+(currentMatches.length-visible)+' restantes)';b.addEventListener('click',showMore);$('#hits').append(b);}}
function show(exact=''){
 const forms=exact?[norm(exact)]:[...new Set(families[$('#lemma').value]||[$('#lemma').value])], counts=new Map(forms.map(x=>[x,{n:0,loci:new Set()}])), matches=[];
 for(const p of passages){let n=0;for(const m of (p.latin||'').matchAll(rex)){const x=norm(m[0]);if(counts.has(x)){const e=counts.get(x);e.n++;e.loci.add(p.locus);n++;}}if(n)matches.push({p,n});}
 $('#forms').replaceChildren();
 for(const [form,e] of counts){if(!e.n)continue;const tr=document.createElement('tr');for(const value of [form,String(e.n),String(e.loci.size)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('#forms').append(tr);}
 currentForms=new Set(forms);currentMatches=matches;visible=0;$('#hits').replaceChildren();showMore();
 $('#status').textContent=matches.length+' pasajes documentados. '+[...counts.values()].reduce((n,x)=>n+x.n,0)+' ocurrencias de la familia seleccionada. Mostrando '+visible+' de '+matches.length+' pasajes.';
}
$('#find').addEventListener('click',()=>show());$('#lemma').addEventListener('change',()=>show());$('#find-exact').addEventListener('click',()=>{const q=$('#exact').value.trim();if(!q){$('#status').textContent='Escribí una forma latina para buscar.';return;}show(q);});$('#exact').addEventListener('keydown',e=>{if(e.key==='Enter'){$('#find-exact').click();}});
fetch('data/structured/recensio-es.json').then(r=>{if(!r.ok)throw Error('Corpus inaccesible');return r.json()}).then(d=>{passages=d.passages||[];for(const p of passages)for(const m of (p.latin||'').matchAll(rex))allForms.add(norm(m[0]));show();}).catch(e=>$('#status').textContent='No se pudo leer V514: '+e.message);