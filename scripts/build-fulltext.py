#!/usr/bin/env python3
"""Index every DOCX body paragraph, table and footnote, retaining source IDs.

Only existing, explicit canonical references are carried into the full corpus.
PDF page matches are normalized textual matches, not claims of human collation.
"""
import argparse,collections,hashlib,json,re,shutil,unicodedata,zipfile
from pathlib import Path
from lxml import etree as E
import fitz
ROOT=Path(__file__).resolve().parents[1]
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def fold(s):
 s=''.join(c for c in unicodedata.normalize('NFD',str(s).lower()) if not unicodedata.combining(c))
 return re.sub(r'[^a-zα-ω]+','',s.replace('v','u').replace('j','i').replace('ς','σ').replace('æ','ae').replace('œ','oe'))
def words(s):
 s=re.sub(r'[-‐‑]\s*\n\s*','',s)
 return [fold(x) for x in re.findall(r'[^\W\d_]{5,}',s) if len(fold(x))>=5]
def text(p):return ''.join(p.xpath('.//w:t/text()',namespaces=NS)).strip()
def main():
 a=argparse.ArgumentParser();a.add_argument('sources');args=a.parse_args();source=Path(args.sources)
 out=ROOT/'data/fulltext';out.mkdir(exist_ok=True)
 cat=json.loads((ROOT/'data/catalog.json').read_text());manifest={'schema':1,'version':'2026-10-30.2','editions':[]}
 notes=json.loads((ROOT/'data/critical-notes.json').read_text())['entries']
 for ed,language,pattern in [('recensio-es','es','*V514*docx'),('recensio-fr','fr','*V554*docx'),('theory-en','en','*V297*docx')]:
  path=next(source.glob(pattern));structured=json.loads((ROOT/f'data/structured/{ed}.json').read_text())
  assert hashlib.sha256(path.read_bytes()).hexdigest()==structured['source']['sha256'], 'Source version mismatch'
  pdf_source=source/(ed+'.pdf');pdf=fitz.open(pdf_source)
  pages=[p.get_text() for p in pdf];folded=[fold(p) for p in pages];inverted=collections.defaultdict(set)
  for i,p in enumerate(pages):
   for w in set(words(p)):inverted[w].add(i)
  def page_for(value):
   needle=fold(value)
   if len(needle)<55:return None
   terms=sorted({w for w in words(value) if w in inverted},key=lambda w:len(inverted[w]))[:4]
   possible=set.intersection(*(inverted[w] for w in terms)) if terms else set()
   # A paragraph can cross a page. Require a unique long verbatim opening,
   # middle or ending and record the page containing the matched anchor.
   probes=list(dict.fromkeys([needle[:100],needle[max(0,len(needle)//2-50):len(needle)//2+50],needle[-100:]]))
   hits=[i+1 for i in sorted(possible) if any(len(n)>=55 and n in folded[i] for n in probes)]
   if len(hits)==1:return hits[0]
   hits=[i+1 for i in range(len(pages)) if len(probes[0])>=55 and probes[0] in folded[i]]
   return hits[0] if len(hits)==1 else None
  byparagraph={}
  for p in structured['passages']:
   for i,field in zip(p['source_paragraphs'],['latin','translation']):
    p['pdf_pages'][field]=page_for(p[field]) or p['pdf_pages'].get(field)
    if p['pdf_pages'][field] is None:del p['pdf_pages'][field]
    byparagraph[i]=(p,'la' if field=='latin' else language,field)
  archive=zipfile.ZipFile(path);doc=E.fromstring(archive.read('word/document.xml'));body=doc.find('w:body',NS);units=[];paragraph_index=0;table_index=0
  for element in body:
   if element.tag==f'{{{NS["w"]}}}p':
    i=paragraph_index;paragraph_index+=1;value=text(element)
    if not value:continue
    p,lang,field=byparagraph.get(i,({},language,None))
    unit={'id':'p'+str(i),'kind':'treatise' if p else 'commentary','language':lang,'text':value,'source_paragraph':i}
    if p:unit.update({k:p[k] for k in ['locus','book','chapter','section']});unit['text']=p[field];unit['page']=p['pdf_pages'].get(field)
    else:unit['page']=page_for(value)
    units.append(unit)
   elif element.tag==f'{{{NS["w"]}}}tbl':
    table_index+=1
    for j,row in enumerate(element.findall('w:tr',NS)):
     cells=[' '.join(text(p) for p in cell.findall('.//w:p',NS)) for cell in row.findall('w:tc',NS)]
     value=' | '.join(cells).strip(' |')
     if value:units.append({'id':f't{table_index}r{j}','kind':'table','language':language,'text':value,'page':page_for(value)})
  for n in notes:
   if n['edition']!=ed:continue
   unit={'id':'n'+str(n['footnote_id']),'kind':'note','language':language,'text':n['text'],'note_id':str(n['footnote_id']),'source_paragraph':n.get('source_paragraph'),'page':page_for(n['text']),'mapping_status':n['mapping_status']}
   if n.get('locus'):
    match=re.fullmatch(r'(\d+)\.(praef|\d+)\.(\d+)',n['locus'])
    if match:unit.update(locus=n['locus'],book=int(match[1]),chapter='praef' if match[2]=='praef' else int(match[2]),section=int(match[3]))
   units.append(unit)
  document={'schema':1,'edition':ed,'version':structured['version'],'language':language,'source':{**structured['source'],'method':'complete_docx_body_tables_and_original_footnotes'},'units':units}
  (out/(ed+'.json')).write_text(json.dumps(document,ensure_ascii=False,separators=(',',':')))
  (ROOT/f'data/structured/{ed}.json').write_text(json.dumps(structured,ensure_ascii=False,separators=(',',':')))
  shutil.copyfile(pdf_source,ROOT/f'documents/{ed}.pdf')
  entry=next(e for e in cat['editions'] if e['id']==ed)
  entry.update(pdf=f'documents/{ed}.pdf',pdf_sha256=hashlib.sha256(pdf_source.read_bytes()).hexdigest(),fulltext_index=f'data/fulltext/{ed}.json',fulltext_units=len(units))
  manifest['editions'].append({'id':ed,'version':structured['version'],'units':len(units),'kinds':dict(collections.Counter(u['kind'] for u in units)),'with_pdf_page':sum(bool(u.get('page')) for u in units),'source':document['source'],'pdf_sha256':entry['pdf_sha256'],'pdf_pages':len(pdf),'canonical_passages':len(structured['passages']),'canonical_pdf_links':sum(bool(p['pdf_pages']) for p in structured['passages'])})
  print(json.dumps(manifest['editions'][-1],ensure_ascii=False),flush=True)
 (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 (ROOT/'data/catalog.json').write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
