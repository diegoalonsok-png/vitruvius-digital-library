#!/usr/bin/env python3
"""Report verifiable coverage/quality of page-aligned historical OCR indexes."""
import argparse,json,re,statistics
from pathlib import Path
a=argparse.ArgumentParser();a.add_argument('index');a.add_argument('--pdf-pages',type=int);a.add_argument('--min-pages',type=int,default=200)
args=a.parse_args()
rows=json.loads(Path(args.index).read_text(encoding='utf8'))
assert isinstance(rows,list) and len(rows)>=args.min_pages
numbers=[r['page'] for r in rows];assert len(set(numbers))==len(numbers),'Duplicate page'
assert numbers==sorted(numbers),'Not in page order'
if args.pdf_pages:assert max(numbers)<=args.pdf_pages,'Out-of-range page'
empty=[r['page'] for r in rows if not r.get('text','').strip()]
short=[r['page'] for r in rows if len(r.get('text','').strip())<30]
terms=['architecture','symmetrie','colonne','temple']
matches={t:sum(len(re.findall(re.escape(t),r.get('text',''),re.I)) for r in rows) for t in terms}
print(json.dumps({'pages':len(rows),'range':[min(numbers),max(numbers)],'empty_pages':empty,
 'short_pages':short,'ocr_characters':sum(len(r.get('text','')) for r in rows),
 'median_chars_per_page':statistics.median(len(r.get('text','')) for r in rows),
 'sample_terms':matches,'warning':'OCR counts are exploratory, not verified readings'},ensure_ascii=False,indent=2))
