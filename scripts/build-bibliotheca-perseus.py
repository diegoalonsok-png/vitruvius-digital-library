#!/usr/bin/env python3
"""Vincula las obras de la Bibliotheca Graeca Latina con textos TEI de Perseus (lectura en tiempo de ejecución).

Entradas: /tmp/perseus/ext.json (metadatos CTS de canonical-greekLit y canonical-latinLit)
          /tmp/match.json (coincidencias automáticas revisadas) más las correcciones manuales de abajo.
Salidas:  data/bibliotheca-perseus.json  (obra de la Bibliotheca → obras de Perseus)
          data/clasicos-perseus-extra.json (obras fuera del período del Lector clásico, mismo esquema)
No copia ningún texto: solo URL de raw.githubusercontent.com."""
import json,sys
ext=json.load(open('/tmp/perseus/ext.json'))
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
 'clement':['tlg1271.tlg001'],'clement-2':['tlg1271.tlg002'],'diognetus':['tlg0646.tlg004'],'ignatius':['tlg1443.tlg001'],
}
def pick(k,lang):
  v=ext[k];fs=v['files']
  if lang=='orig':
    c=[f for f in fs if any(t in f for t in ('-grc','-lat'))]
    per=sorted(f for f in c if 'perseus' in f)
    return per[-1] if per else (sorted(c)[-1] if c else None)
  return sorted(f for f in fs if '-eng' in f)
def url(k,f):
  a,w=k.split('.')[:2]
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
    extra[k]={'urn':'urn:cts:'+ext[k]['repo'].split('-')[1]+':'+k,'id':k,'authorId':k.split('.')[0],'author':w['author'],'dates':w.get('dating',''),
      'title':ext[k]['title'],'language':'grc' if '-grc' in o else 'la','original':url(k,o),'translations':[{'language':'en','url':url(k,f)} for f in t[-1:]],'bibliotheca':bid}
json.dump({'schema':'bibliotheca-perseus/1','note':'Obra de la Bibliotheca Graeca Latina → obras TEI de Perseus Digital Library (CC BY-SA 4.0), leídas en tiempo de ejecución.','links':links},open('data/bibliotheca-perseus.json','w'),ensure_ascii=False,indent=0)
json.dump({'schema':cat.get('schema'),'scope':'Obras de la Bibliotheca Graeca Latina fuera del período del índice del Lector clásico; mismo formato, lectura en tiempo de ejecución desde Perseus.','license':cat.get('license'),'works':list(extra.values())},open('data/clasicos-perseus-extra.json','w'),ensure_ascii=False,indent=0)
print(len(links),'obras vinculadas de',len(bib),'·',len(extra),'obras extra',file=sys.stderr)
