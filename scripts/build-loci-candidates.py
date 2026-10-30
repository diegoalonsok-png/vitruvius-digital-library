#!/usr/bin/env python3
"""Generate *candidate* chapter/locus references from searchable author PDF text.
Never call these verified without checking facsimile and original context.
"""
import json,re,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
sources=['recensio-es','recensio-fr','theory-en']
out={'schema':1,'method':'Explicit Vitruvian references detected in born-digital PDF text; candidate only, not a verified passage alignment','editions':{}}
pat=re.compile(r'(?i)(?:vitruv(?:io|ius|e)?\s*[,.:—-]?\s*)?(?:de\s+architectura\s*)?(?:lib(?:er|ro|re|er\s*)?\s*)?\b([IVX]{1,5}|10|[1-9])\s*[.·,]\s*(\d{1,2})\s*[.·,]\s*(\d{1,3})\b')
for ident in sources:
 path=root/'data/text'/f'{ident}.json'
 if not path.exists():continue
 pages=json.loads(path.read_text(encoding='utf-8'))
 found={}
 for p in pages:
  text=p['text']
  for m in pat.finditer(text):
   book_str=m.group(1).upper()
   roman={'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,'VIII':8,'IX':9,'X':10}
   book=roman.get(book_str)
   if book is None:
    try:book=int(book_str)
    except ValueError:continue
   ch=int(m.group(2));section=int(m.group(3))
   if book not in range(1,11) or ch not in range(1,31) or section not in range(1,101):continue
   key=f'{book}.{ch}.{section}'
   found.setdefault(key,[])
   if p['page'] not in found[key]:found[key].append(p['page'])
 out['editions'][ident]={k:v[:20] for k,v in sorted(found.items())}
 print(ident,'candidate loci',len(found))
target=root/'data/loci-candidates.json'
target.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
