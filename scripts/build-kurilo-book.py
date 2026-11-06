#!/usr/bin/env python3
"""Registra un libro de Diego Kurilo en la biblioteca: lee el PDF de cada lengua (índice de marcadores y texto
por página con pdftotext) y escribe data/kurilo-libros/<id>.json, data/text/<id>-<lengua>.json y el índice
data/kurilo-libros/index.json. Uso:
  python3 scripts/build-kurilo-book.py <id> '<json con metadatos>' es=documents/x-es.pdf en=documents/x-en.pdf"""
import json,subprocess,sys,os
from pypdf import PdfReader
bid=sys.argv[1];meta=json.loads(sys.argv[2]);pdfs=dict(a.split('=',1) for a in sys.argv[3:])
book={'id':bid,'author':'Kurilo, Diego','publisher':'Sophia Lux Ediciones Académicas','year':'2026',**meta,'editions':{}}
for lang,f in pdfs.items():
  r=PdfReader(f);toc=[]
  def walk(items,lvl=1):
    for it in items:
      if isinstance(it,list):walk(it,lvl+1)
      else:
        try:toc.append([lvl,str(it.title).strip(),r.get_destination_page_number(it)+1])
        except Exception:pass
  walk(r.outline)
  t=str((r.metadata or {}).get('/Title','')).strip();title,_,sub=t.partition('. ')
  sub=sub or meta.get('subtitles',{}).get(lang,'')
  book['editions'][lang]={'language':lang,'title':title,'subtitle':sub,'pdf':f,'pages':len(r.pages),'toc':toc,'text':f'data/text/{bid}-{lang}.json'}
  pages=[{'page':i+1,'text':' '.join(subprocess.run(['pdftotext','-f',str(i+1),'-l',str(i+1),f,'-'],capture_output=True,text=True).stdout.split())} for i in range(len(r.pages))]
  json.dump(pages,open(f'data/text/{bid}-{lang}.json','w'),ensure_ascii=False,separators=(',',':'))
book.pop('subtitles',None)
json.dump(book,open(f'data/kurilo-libros/{bid}.json','w'),ensure_ascii=False,indent=1)
idx_path='data/kurilo-libros/index.json'
idx=json.load(open(idx_path)) if os.path.exists(idx_path) else {'schema':'kurilo-libros/1','books':[]}
idx['books']=[b for b in idx['books'] if b['id']!=bid]+[{'id':bid,'page':f'{bid}.html','titles':{k:v['title'] for k,v in book['editions'].items()},'subtitles':{k:v['subtitle'] for k,v in book['editions'].items()},'subjects':book.get('subjects',[]),'file':f'data/kurilo-libros/{bid}.json'}]
json.dump(idx,open(idx_path,'w'),ensure_ascii=False,indent=1)
print(bid,{k:(v['pages'],len(v['toc'])) for k,v in book['editions'].items()})
