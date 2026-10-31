#!/usr/bin/env python3
"""Parse page-separated Internet Archive OCR (DjVu XML) as page-indexed concordance."""
import json,sys,xml.etree.ElementTree as ET
from pathlib import Path
xml=ET.parse(sys.argv[1]).getroot()
pages=[]
for i,obj in enumerate(xml.iter()):
    if obj.tag.lower().endswith('object') and 'page' in str(obj.attrib).lower():
        text=' '.join(t.text or '' for t in obj.iter() if t.tag.lower().endswith('word'))
        pages.append({'page':len(pages)+1,'text':text})
if len(pages)<100:
    raise SystemExit('OCR source missing page boundaries: '+str(len(pages)))
out=Path(sys.argv[2]);out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(pages,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('Indexed',len(pages),'OCR pages to',out)
