#!/usr/bin/env python3
"""Build a local Latin/Ancient Greek lexicon scoped to all attested corpus forms.

Input: Wiktextract JSONL downloads from https://kaikki.org/ (CC BY-SA/GFDL).
Example:
 python scripts/build-classical-dictionary.py --latin /path/Latin.jsonl.gz --greek /path/AncientGreek.jsonl.gz
The build is performed OFFLINE, never per visitor. The source files are not
committed. Dictionary entries retain original lemmas, POS and source attribution.
"""
import argparse, gzip, json, re, unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CORPORA=('recensio-es','recensio-fr','theory-en')
def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD',s.casefold()) if not unicodedata.combining(c)).replace('v','u').replace('j','i')
def corpus_forms():
    words=set()
    for name in CORPORA:
        data=json.loads((ROOT/'data'/'structured'/f'{name}.json').read_text())
        for p in data['passages']:
            for text in (p['latin'],p['translation']):
                for w in re.findall(r'[^\W_\d]+',text,flags=re.UNICODE):
                    if len(w)>1:words.add(norm(w))
    return words
def stream(path):
    with (gzip.open(path,'rt',encoding='utf8') if str(path).endswith('.gz') else open(path,encoding='utf8')) as file:
        for line in file:
            try: yield json.loads(line)
            except (ValueError,UnicodeError):continue
def build(path,lang,forms):
    output={}
    for entry in stream(path):
        if entry.get('lang')!=lang:continue
        lemma=entry.get('word','')
        variants=[lemma]+[f.get('form','') for f in entry.get('forms',[]) if isinstance(f,dict)]
        matched=[x for x in variants if norm(x) in forms]
        if not matched:continue
        glosses=[g for sense in entry.get('senses',[]) for g in sense.get('glosses',[]) if isinstance(g,str)]
        obj={'lemma':lemma,'pos':entry.get('pos',''),'glosses':glosses[:6],
             'source':'Wiktionary / Wiktextract (Kaikki.org)'}
        for form in matched:
            key=norm(form)
            output.setdefault(key,[])
            if len(output[key])<8 and not any(x['lemma']==lemma and x['pos']==obj['pos'] for x in output[key]):
                output[key].append(obj)
    return output
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--latin',required=True)
    ap.add_argument('--greek',required=True)
    ap.add_argument('--out',default='data/classical-dictionary.json')
    args=ap.parse_args()
    forms=corpus_forms()
    la=build(args.latin,'Latin',forms)
    gr=build(args.greek,'Ancient Greek',forms)
    outdir=ROOT/'data'/'dictionaries'
    outdir.mkdir(parents=True,exist_ok=True)
    for language,entries in [('latin',la),('greek',gr)]:
        payload={'schema':1,'language':language,'entries':entries,
                 'source':'Kaikki.org / Wiktextract (Wiktionary)',
                 'license':'CC BY-SA / GFDL; consult source terms'}
        target=outdir/f'{language}.json'
        target.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf8')
        print(f'Wrote {target}: {len(entries)} attested forms')

if __name__=='__main__':main()
