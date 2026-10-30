#!/usr/bin/env python3
"""Academic site integrity checks; does not claim to validate philological readings."""
import json,re,pathlib,html.parser,sys
root=pathlib.Path(__file__).resolve().parents[1]
issues=[]; warnings=[]
def check(cond,msg):
    if not cond: issues.append(msg)
def warn(cond,msg):
    if not cond: warnings.append(msg)
cat=json.loads((root/'data/catalog.json').read_text(encoding='utf8'))
hist=json.loads((root/'data/historical.json').read_text(encoding='utf8'))
inv=json.loads((root/'data/corpus-expansion-inventory.json').read_text(encoding='utf8'))
allrecords=cat['editions']+hist
ids=[r['id'] for r in allrecords]
check(len(ids)==len(set(ids)),'Duplicated edition IDs')
check(all(r.get('title') and r.get('year') and r.get('languages') for r in allrecords),'Bibliographic title/year/language missing')
check(len(inv['records'])>=74,'Bibliographic inventory unexpectedly shortened')
class AuditHTML(html.parser.HTMLParser):
    def __init__(self): super().__init__(); self.ids=set();self.local_links=[];self.scripts=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:
            if d['id'] in self.ids: issues.append('Duplicate HTML id '+d['id'])
            self.ids.add(d['id'])
        if tag in ('a','script','link'):
            u=d.get('href') or d.get('src')
            if u and not u.startswith(('http:','https:','mailto:','data:','javascript:','//')):
                self.local_links.append(u)
                if tag=='script':self.scripts.append(u)
for page in ['index.html','bibliografia.html']:
    a=AuditHTML();a.feed((root/page).read_text(encoding='utf8'))
    for u in a.local_links:
        clean=u.split('#')[0].split('?')[0]
        if clean: check((root/clean).is_file(),page+': missing local asset '+u)
        if u.startswith('#'):check(u[1:] in a.ids,page+': nonexistent anchor '+u)
    print(page,'HTML references',len(a.local_links))
js=(root/'assets/app.js').read_text(encoding='utf8')
check('$$$(' not in js,'Invalid selector helper $$$ detected')
check(not re.search(r"(?<!\$)\$\('[^']+'\)\.forEach",js),'querySelector used as an iterable')
for required in ['[data-query]','[data-read],[data-compare]','function openReader','function openComparison','function renderComparePane']:
    check(required in js,'UI handler missing: '+required)
check('Palabra o frase no encontrada' in js,'Missing explicit empty-result notification')
check('Locus' in js or 'locus' in js,'Locus reference interface absent')
pages=0
for e in cat['editions']:
    p=e.get('pdf')
    if e.get('available'): check(bool(p) and (root/p).is_file(),'Published PDF missing: '+e['id'])
    if e.get('searchable'):
        path=e.get('text_index')
        if not path or not (root/path).is_file():
            issues.append('Missing search index '+e['id']);continue
        data=json.loads((root/path).read_text(encoding='utf8'))
        check(isinstance(data,list) and len(data)==e['pages'],'Index page count mismatch: '+e['id'])
        check(all(x.get('page')==i+1 and isinstance(x.get('text'),str) for i,x in enumerate(data)),'Index page order or text invalid: '+e['id'])
        pages+=len(data)
        warn(any(x.get('book') is not None and x.get('chapter') is not None for x in data),'No verified book/chapter loci in '+e['id'])
    if e['id'] in ('recensio-es','recensio-fr','theory-en'):
        warn(e.get('available') and e.get('searchable'),'Author edition not published/searchable: '+e['id'])
warn(pages==cat.get('searchable_pages'),'searchable_pages metadata mismatch')
print('Indexed pages:',pages,'; issues:',len(issues),'; academic/integration warnings:',len(warnings))
for w in warnings:print('WARNING:',w)
for e in issues:print('ERROR:',e,file=sys.stderr)
sys.exit(bool(issues))
