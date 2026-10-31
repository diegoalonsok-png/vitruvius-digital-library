const $=s=>document.querySelector(s);
const families={
 machina:['machina','machinae','machinam','machinarum','machinis','machinas','machinarum','machinaque'],
 dispositio:['dispositio','dispositionis','dispositionem','dispositione','dispositiones','dispositionum','dispositionibus'],
 architectura:['architectura','architecturae','architecturam','architecturarum','architecturis','architecturas'],
 symmetria:['symmetria','symmetriae','symmetriam','symmetriarum','symmetriis','symmetrias'],
 locus:['locus','loci','loco','locum','locorum','locis','locos','loca','locorum','locis']
};
let passages=[];
const norm=s=>String(s).toLocaleLowerCase('la').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/æ/g,'ae').replace(/œ/g,'oe');
const rex=/[\p{L}\p{M}]+/gu;
function show(){
 const forms=[...new Set(families[$('#lemma').value])], counts=new Map(forms.map(x=>[x,{n:0,loci:new Set()}])), matches=[];
 for(const p of passages){let n=0;for(const m of (p.latin||'').matchAll(rex)){const x=norm(m[0]);if(counts.has(x)){const e=counts.get(x);e.n++;e.loci.add(p.locus);n++;}}if(n)matches.push({p,n});}
 $('#forms').replaceChildren();
 for(const [form,e] of counts){if(!e.n)continue;const tr=document.createElement('tr');for(const value of [form,String(e.n),String(e.loci.size)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('#forms').append(tr);}
 $('#hits').replaceChildren();for(const {p,n} of matches.slice(0,45)){const a=document.createElement('article'),h=document.createElement('strong'),paragraph=document.createElement('p');h.textContent=p.locus+' · '+n+' coincidencia(s)';paragraph.textContent=p.latin;a.append(h,paragraph);$('#hits').append(a);}
 $('#status').textContent=matches.length+' pasajes documentados. '+[...counts.values()].reduce((n,x)=>n+x.n,0)+' ocurrencias de la familia seleccionada. Primeros 45 pasajes.';
}
$('#find').addEventListener('click',show);$('#lemma').addEventListener('change',show);
fetch('data/structured/recensio-es.json').then(r=>{if(!r.ok)throw Error('Corpus inaccesible');return r.json()}).then(d=>{passages=d.passages||[];show();}).catch(e=>$('#status').textContent='No se pudo leer V514: '+e.message);