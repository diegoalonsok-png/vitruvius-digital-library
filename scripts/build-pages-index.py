#!/usr/bin/env python3
"""Índice invertido de páginas de todos los libros del sitio (ediciones de Diego Kurilo y PDF históricos con OCR)
para que Vitruvia encuentre en qué página de cada libro aparece un término.
Entrada: data/text/*.json ([{page,text}]). Salida: data/pages-index/meta.json y fragmentos por las dos
primeras letras de la palabra normalizada (data/pages-index/<xx>.json: palabra → {fuente: [páginas]}).
Normalización: sin diacríticos, minúsculas, ſ→s, j→i, v→u (grafías latinas). Palabras de 4 a 30 letras.
El OCR no se corrige: una coincidencia en OCR es una pista de lectura, no un cotejo."""
import json,os,re,unicodedata,collections,shutil
SRC=[
 ('recensio-es','V514 · Kurilo · latín y castellano','edition','documents/kurilo-recensio-es.pdf#page={p}'),
 ('recensio-fr','V554 · Kurilo · latín y francés','edition','documents/kurilo-recensio-fr.pdf#page={p}'),
 ('theory-en','V297 · Kurilo · latín e inglés','edition','documents/kurilo-theory-en.pdf#page={p}'),
 ('krohn-1912','Krohn 1912 · edición latina (OCR)','ocr','documents/krohn-1912.pdf#page={p}'),
 ('rose-1899','Rose 1899 · edición latina (OCR)','ocr','https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf#page={p}'),
 ('barbaro-1567-la','Barbaro 1567 · latín (OCR)','ocr','barbaro-enfrentado-1567.html?q={q}'),
 ('barbaro-1567-it','Barbaro 1567 · italiano (OCR)','ocr','barbaro-enfrentado-1567.html?q={q}'),
 ('cesariano-1521','Cesariano 1521 · italiano (OCR)','ocr','cesariano-1521.html?image={p}'),
 ('perrault-1673','Perrault 1673 · francés (OCR)','ocr','https://www.e-rara.ch/download/pdf/16797458.pdf#page={p}'),
 ('cristianismo-primitivo-es','Kurilo · Cristianismo primitivo (castellano)','edition','cristianismo-primitivo.html?lang=es&page={p}&q={q}'),
 ('cristianismo-primitivo-en','Kurilo · Early Christianity (inglés)','edition','cristianismo-primitivo.html?lang=en&page={p}&q={q}'),
 ('persia-judaismo-antiguo-es','Kurilo · Persia y el judaísmo antiguo (castellano)','edition','persia-judaismo-antiguo.html?lang=es&page={p}&q={q}'),
 ('persia-judaismo-antiguo-en','Kurilo · Persia and Ancient Judaism (inglés)','edition','persia-judaismo-antiguo.html?lang=en&page={p}&q={q}'),
 ('ortiz-1787','Ortiz y Sanz 1787 · castellano (OCR)','ocr','https://archive.org/download/A065112/A065112.pdf#page={p}'),
]
def norm(s):
  s=unicodedata.normalize('NFD',s.replace('ſ','s')).encode('ascii','ignore').decode().lower()
  return s.replace('j','i').replace('v','u')
TOK=re.compile(r'[a-z]{4,30}')
index=collections.defaultdict(lambda:collections.defaultdict(set))
meta=[]
for sid,label,kind,url in SRC:
  f=f'data/text/{sid}.json'
  if not os.path.exists(f):continue
  pages=json.load(open(f));meta.append({'id':sid,'label':label,'kind':kind,'url':url,'pages':len(pages)})
  for p in pages:
    for t in set(TOK.findall(norm(p.get('text') or ''))):index[t][sid].add(int(p['page']))
out='data/pages-index';shutil.rmtree(out,ignore_errors=True);os.makedirs(out)
EDS={m['id'] for m in meta if m['kind']=='edition'}
shards=collections.defaultdict(dict)
kept=0
for t,by in index.items():
  # Ruido de OCR: palabras que solo aparecen en una página de una fuente OCR se descartan.
  if not (set(by)&EDS) and sum(len(v) for v in by.values())<2:continue
  shards[t[:3]][t]={s:sorted(v)[:60] for s,v in by.items()};kept+=1
for k,v in shards.items():json.dump(v,open(f'{out}/{k}.json','w'),separators=(',',':'))
json.dump({'schema':'pages-index/1','normalization':'NFD sin diacríticos, minúsculas, ſ→s, j→i, v→u; 4–30 letras','sources':meta,'tokens':kept,'shard':'tres primeras letras'},open(f'{out}/meta.json','w'),ensure_ascii=False,indent=1)
tot=sum(os.path.getsize(f'{out}/{f}') for f in os.listdir(out))
print(kept,'palabras ·',len(shards),'fragmentos ·',round(tot/1024/1024,2),'MB')
