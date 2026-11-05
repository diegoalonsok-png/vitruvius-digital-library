#!/usr/bin/env python3
"""Vincula las obras de la Bibliotheca Graeca Latina con textos TEI de Perseus (lectura en tiempo de ejecución).

Entradas: /tmp/perseus/ext.json (metadatos CTS de canonical-greekLit y canonical-latinLit)
          /tmp/match.json (coincidencias automáticas revisadas) más las correcciones manuales de abajo.
Salidas:  data/bibliotheca-perseus.json  (obra de la Bibliotheca → obras de Perseus)
          data/clasicos-perseus-extra.json (obras fuera del período del Lector clásico, mismo esquema)
No copia ningún texto: solo URL de raw.githubusercontent.com."""
import json,sys
ext=json.load(open('/tmp/perseus/ext.json'))
# First1KGreek (Open Greek and Latin): mismo formato CTS/EpiDoc; se combina archivo por archivo.
for k,v in json.load(open('/tmp/perseus/f1k.json')).items():
  e=ext.setdefault(k,{'repo':'First1KGreek','author':v['author'],'title':v['title'],'files':[]})
  e.setdefault('src',{})
  for f in v['files']:
    if f not in e['files']:e['files'].append(f);e['src'][f]='First1KGreek'
auto=json.load(open('/tmp/map.json'))
cat=json.load(open('data/clasicos-perseus.json'))
incat={w['id'] for w in cat['works']}
bib={w['id']:w for w in json.load(open('data/bibliotheca-graeca-latina-I-bce-I-ce.json'))['works']}
SKIP={'vitruvius','vitruvio-v514-pdf','vitruvio-v554-pdf','krohn-1912-pdf','theory-v297-pdf'}
rng=lambda p,a,b,w=3:[f'{p}{str(i).zfill(w)}' for i in range(a,b+1)]
FIX={
 'tacitus-historiae':['phi1351.phi004'],'euripides-iphigenia-aulid':['tlg0006.tlg018'],
 'aeschylus-oresteia':['tlg0085.tlg005','tlg0085.tlg006','tlg0085.tlg007'],'aeschylus-persae':['tlg0085.tlg002'],'aeschylus-suppliants':['tlg0085.tlg001'],
 'thucydides-war':['tlg0003.tlg001'],'euripides-troades':['tlg0006.tlg011'],
 'aristophanes-aves':['tlg0019.tlg006'],'aristophanes-ranae':['tlg0019.tlg009'],'aristophanes-vespae':['tlg0019.tlg004'],'aristophanes-pax':['tlg0019.tlg005'],'aristophanes-acharnenses':['tlg0019.tlg001'],
 'demosthenes-de-corona':['tlg0014.tlg018'],'demosthenes-philippicae':['tlg0014.tlg004','tlg0014.tlg006','tlg0014.tlg009','tlg0014.tlg010'],
 'homeric-hymns':rng('tlg0013.tlg',1,33),'horace-sermones':['phi0893.phi004'],'seneca-tragoediae':rng('phi1017.phi',1,10),
 'suetonius-caesares':rng('phi1348.abo',11,22),'nepos':rng('phi0588.abo',1,25),'diodorus':['tlg0060.tlg001'],'dionysius':['tlg0081.tlg001'],
 'lucan':['phi0917.phi001'],'plutarch-lives':rng('tlg0007.tlg',1,66),'plutarch-moralia':[k for k in sorted(ext) if k.startswith('tlg0007.tlg') and k>='tlg0007.tlg067'],
 'pseudo-apollodorus-bibliotheca':['tlg0548.tlg001','tlg0548.tlg002'],'appian-romaika':[k for k in sorted(ext) if k.startswith('tlg0551.')],
 'marcus-aurelius-meditations':['tlg0562.tlg001'],'arrian-anabasis-alexandri':['tlg0074.tlg001'],'hippocrates-aphorisms':['tlg0627.tlg012'],
 'ovid-heroides':['phi0959.phi002'],'ovid-ex-ponto':['phi0959.phi009'],'cicero-oratore':['phi0474.phi037'],
 'mark':['tlg0031.tlg002'],'didache':['tlg1311.tlg001'],'pastor-hermas':['tlg1419.tlg001'],'polycarp':['tlg1622.tlg001'],'justin':['tlg0645.tlg001'],'irenaeus':['tlg1447.tlg001'],'eusebio':['tlg2018.tlg002'],
 'philo':['tlg0018.tlg001'],'philo-legum-allegoriae':['tlg0018.tlg002'],'philo-de-vita-mosis':['tlg0018.tlg022'],'galen-ars-medica':['tlg0057.tlg007'],'galen-de-usu-partium':['tlg0057.tlg017'],
 'ptolemy-almagest':['tlg0363.tlg001'],'euclid-optica':['tlg1799.tlg009'],'euclid-phaenomena':['tlg1799.tlg012','tlg1799.tlg015'],'cleonides-harmonica':['tlg0361.tlg001'],'aristoxenus-harmonica':['tlg0088.tlg001'],
 'hero-pneumatica':['tlg0559.tlg001'],'hero-automata':['tlg0559.tlg002'],'hero-belopoeica':['tlg0559.tlg012'],'archimedes-fluitantibus':['tlg0552.tlg008'],'apollonius-conica':['tlg0550.tlg001'],'pappus-synagoge':['tlg2032.tlg001'],
 'geminus-isagoge':['tlg1383.tlg001'],'aristarchus-magnitudines':['tlg1181.tlg001'],'cebes-tabula':['tlg1247.tlg001'],'ps-aristotle-mechanica':['tlg0086.tlg023'],'aristotle-physics':['tlg0086.tlg031'],'aristotle-de-anima':['tlg0086.tlg002'],
 'theophrastus-historia-plantarum':['tlg0093.tlg001'],'dioscorides':['tlg0656.tlg001'],
 'clement':['tlg1271.tlg001'],'clement-2':['tlg1271.tlg002'],'diognetus':['tlg0646.tlg004'],'ignatius':['tlg1443.tlg001'],
}
def pick(k,lang):
  v=ext[k];fs=v['files']
  if lang=='orig':
    c=[f for f in fs if any(t in f for t in ('-grc','-lat'))]
    per=sorted(f for f in c if 'perseus' in f)
    return per[-1] if per else (sorted(c,key=lambda f:('1st1K' not in f,f))[0] if c else None)
  return sorted(f for f in fs if '-eng' in f)
def url(k,f):
  a,w=k.split('.')[:2]
  if ext[k].get('src',{}).get(f)=='First1KGreek' or ext[k]['repo']=='First1KGreek':
    return f"https://raw.githubusercontent.com/OpenGreekAndLatin/First1KGreek/master/data/{a}/{w}/{f}"
  return f"https://raw.githubusercontent.com/PerseusDL/{ext[k]['repo']}/master/data/{a}/{w}/{f}"
links={};extra={}
for bid,w in bib.items():
  if bid in SKIP:continue
  ids=FIX.get(bid) or ([auto[bid]['perseus']] if bid in auto else [])
  ids=[k for k in ids if k in ext and pick(k,'orig')]
  if not ids:continue
  links[bid]=[{'obra':k,'title':ext[k]['title'],'translation':any('-eng' in f for f in ext[k]['files'])} for k in ids]
  for k in ids:
    if k in incat or k in extra:continue
    o=pick(k,'orig');t=pick(k,'eng')
    extra[k]={'urn':'urn:cts:'+('greekLit' if k.startswith('tlg') else 'latinLit')+':'+k,'id':k,'authorId':k.split('.')[0],'author':w['author'],'dates':w.get('dating',''),
      'title':ext[k]['title'],'language':'grc' if '-grc' in o else 'la','original':url(k,o),'translations':[{'language':'en','url':url(k,f)} for f in t[-1:]],'bibliotheca':bid}
# Vitruvio (Perseus) en el catálogo ampliado para la búsqueda en el corpus; la Bibliotheca usa las ediciones propias.
k='phi1056.phi001'
if k in ext and k not in incat and pick(k,'orig'):
  extra[k]={'urn':'urn:cts:latinLit:'+k,'id':k,'authorId':'phi1056','author':'Vitruvio','dates':'c. 30–20 a. C.','title':'De architectura','language':'la','original':url(k,pick(k,'orig')),'translations':[{'language':'en','url':url(k,f)} for f in pick(k,'eng')[-1:]],'bibliotheca':'vitruvius'}
# The Latin Library (texto plano de dominio público, espejo de CLTK en GitHub) para obras latinas sin TEI.
LL='https://raw.githubusercontent.com/cltk/latin_text_latin_library/master/'
LLW={
 'varro-rustica':('Rerum rusticarum libri III',[f'varro.rr{i}.txt' for i in range(1,4)]),
 'varro-de-lingua-latina':('De lingua Latina V–X',[f'varro.ll{i}.txt' for i in range(5,11)]),
 'seneca-naturales':('Naturales quaestiones',[f'sen/sen.qn{i}.txt' for i in range(1,8)]),
 'seneca-de-brevitate':('De brevitate vitae',['sen/sen.brevita.txt']),
 'seneca-de-ira':('De ira',[f'sen/sen.ira{i}.txt' for i in range(1,4)]),
 'seneca-de-tranquillitate':('De tranquillitate animi',['sen/sen.tranq.txt']),
 'frontinus':('De aquaeductu urbis Romae',['frontinus/aqua1.txt','frontinus/aqua2.txt']),
 'frontinus-strategemata':('Strategemata',[f'frontinus/strat{i}.txt' for i in range(1,5)]),
 'frontinus-gromatica':('Opuscula gromatica',['frontinus/qualitate.txt','frontinus/contro.txt','frontinus/lim.txt','frontinus/mensoria.txt']),
 'petronius-satyrica':('Satyrica',['petronius1.txt','petroniusfrag.txt']),
 'phraedrus-fabulae':('Fabulae',[f'phaedr{i}.txt' for i in range(1,6)]+['phaedrapp.txt']),
 'velleius-historia':('Historia Romana',['vell1.txt','vell2.txt']),
 'apuleius-de-deo-socratis':('De deo Socratis',['apuleius/apuleius.deosocratis.txt']),
 'vegetius-epitoma':('Epitoma rei militaris',[f'vegetius{i}.txt' for i in range(1,5)]),
 'augustine-confessiones':('Confessiones',[f'augustine/conf{i}.txt' for i in range(1,14)]),
 'augustine-civitate-dei':('De civitate Dei',[f'augustine/civ{i}.txt' for i in range(1,23)]),
 'isidore-etymologiae':('Etymologiae',[f'isidore/{i}.txt' for i in range(1,21)]),
 'censorinus-die-natali':('De die natali',['censorinus.txt']),
 'augustus-res-gestae':('Res gestae divi Augusti',['resgestae.txt']),
}
for bid,(title,files) in LLW.items():
  w=bib.get(bid)
  if not w or bid in links:continue
  k='ll.'+bid
  extra[k]={'urn':'thelatinlibrary:'+files[0],'id':k,'authorId':'ll-'+bid.split('-')[0],'author':w['author'],'dates':w.get('dating',''),'title':title,'language':'la',
    'original':LL+files[0],'parts':[{'n':str(i+1),'url':LL+f} for i,f in enumerate(files)],'translations':[],'source':'The Latin Library','bibliotheca':bid}
  links[bid]=[{'obra':k,'title':title,'translation':False}]
json.dump({'schema':'bibliotheca-perseus/1','note':'Obra de la Bibliotheca Graeca Latina → obras TEI de Perseus Digital Library (CC BY-SA 4.0), leídas en tiempo de ejecución.','links':links},open('data/bibliotheca-perseus.json','w'),ensure_ascii=False,indent=0)
json.dump({'schema':cat.get('schema'),'scope':'Obras de la Bibliotheca Graeca Latina fuera del período del índice del Lector clásico; mismo formato, lectura en tiempo de ejecución desde Perseus.','license':cat.get('license'),'works':list(extra.values())},open('data/clasicos-perseus-extra.json','w'),ensure_ascii=False,indent=0)
print(len(links),'obras vinculadas de',len(bib),'·',len(extra),'obras extra',file=sys.stderr)
