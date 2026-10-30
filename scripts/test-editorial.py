"""Check published editorial promises against local metadata and HTML structure."""
from html.parser import HTMLParser
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.h1=0; self.description=False; self.skip=False; self.footer=False; self.css=False; self.ids=set()
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='h1': self.h1+=1
        if tag=='meta' and a.get('name')=='description': self.description=bool(a.get('content'))
        if tag=='a' and 'skip' in a.get('class','').split(): self.skip=a.get('href','').startswith('#')
        if tag=='footer': self.footer=True
        if tag=='link' and 'assets/academic.css' in a.get('href',''): self.css=True
        if a.get('id'): assert a['id'] not in self.ids, f"Duplicate ID {a['id']}"; self.ids.add(a['id'])
for name in ['index','metodologia','estudios','bibliografia','lector-bilingue','basilica-fano','auditoria']:
    p=Page();p.feed((root/(name+'.html')).read_text())
    assert p.h1==1 and p.description and p.skip and p.footer and p.css, (name,vars(p))
records=json.loads((root/'data/academic-studies.json').read_text())['records']
assert len({r['id'] for r in records})==len(records)
for r in records:
    assert r['source'] and r['verification']
    assert r['verification_status'] in ['checked','pending']
    assert (r['verification_status']=='checked')==('contrastad' in r['verification'])
    if r['verification_status']=='checked': assert r.get('url'),r['id']
assert len(records)==53 and sum(r['verification_status']=='checked' for r in records)==8
lex=json.loads((root/'data/latin-lexicon.json').read_text())['entries']
assert len(lex)==38 and sum(bool(r.get('verified')) for r in lex)==2
print('Editorial checks passed: seven pages, bibliography provenance and audit counts.')
