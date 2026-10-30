#!/usr/bin/env python3
"""Build page-level searchable indexes from the author's publicly shared PDFs."""
import json, pathlib, sys, shutil
import fitz
import gdown
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCES={'recensio-es':'19qZMjNezQqAdrzH9aLt3N4PN_UfxfxwZ','recensio-fr':'12P4-4hADEpR67DfeqOfN9DVntgnOx0DE','theory-en':'1b5sSpZuxpp3QUyradY_l-OJaY09rbir1'}
catalog_path=ROOT/'data/catalog.json'
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
for record in catalog['editions']:
    ident=record.get('id')
    if ident not in SOURCES: continue
    print('Downloading',ident,flush=True)
    output='/tmp/'+ident+'.pdf'
    got=gdown.download(id=SOURCES[ident],output=output,quiet=False)
    if not got: raise RuntimeError('Cannot download '+ident)
    local_pdf=ROOT/'documents'/f'{ident}.pdf'
    local_pdf.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(output,local_pdf)
    record['pdf']='documents/'+ident+'.pdf'
    record['external']=False
    doc=fitz.open(output)
    pages=[]
    for i,page in enumerate(doc):
        text=page.get_text('text',sort=True)
        pages.append({'page':i+1,'text':text})
    if len(pages)<900 or sum(len(p['text'].strip())>20 for p in pages)<800:
        raise RuntimeError('Insufficient extracted text for '+ident)
    target=ROOT/'data/text'/f'{ident}.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(pages,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    record['text_index']='data/text/'+ident+'.json'
    record['searchable']=True
    record['searchable_pages']=sum(bool(p['text'].strip()) for p in pages)
    record['pages']=len(pages)
    print(ident,record['pages'],'PDF pages',record['searchable_pages'],'pages with text',flush=True)
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
