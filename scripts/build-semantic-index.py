#!/usr/bin/env python3
"""Offline, reproducible multilingual passage embedding builder.

Optional build step: pip install sentence-transformers numpy
Run: python scripts/build-semantic-index.py --model intfloat/multilingual-e5-small

This never makes a paid API call. It does download a public model and requires
a local machine or CI with sufficient RAM. Not part of default Pages deployment.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CORPORA=['recensio-es','recensio-fr','theory-en']

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--model',default='intfloat/multilingual-e5-small')
    ap.add_argument('--output',default='data/semantic-index')
    ap.add_argument('--batch-size',type=int,default=24)
    args=ap.parse_args()
    from sentence_transformers import SentenceTransformer
    import numpy as np
    output=ROOT/args.output
    output.mkdir(parents=True,exist_ok=True)
    records=[]
    for edition in CORPORA:
        obj=json.loads((ROOT/'data'/'structured'/f'{edition}.json').read_text(encoding='utf-8'))
        for passage in obj['passages']:
            for lang,body in [('la',passage['latin']),(obj['language'],passage['translation'])]:
                if not body.strip():
                    continue
                records.append({'id':f"{edition}:{passage['locus']}:{lang}",
                                'edition':edition,'locus':passage['locus'],'language':lang,
                                'text':body})
    # E5 models require passage: and query: prefixes. This model is only a
    # default candidate: benchmark classical Latin/Greek before academic release.
    model=SentenceTransformer(args.model)
    text=['passage: '+r['text'] for r in records]
    vectors=model.encode(text,batch_size=args.batch_size,normalize_embeddings=True,
                         show_progress_bar=True,convert_to_numpy=True)
    if not np.isfinite(vectors).all():raise ValueError('Non-finite embeddings')
    np.save(output/'passages.npy',vectors.astype('<f4'),allow_pickle=False)
    (output/'passages.json').write_text(json.dumps([
        {k:v for k,v in record.items() if k!='text'} for record in records
    ],ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    checksum=hashlib.sha256((output/'passages.npy').read_bytes()).hexdigest()
    manifest={'schema':1,'model':args.model,'query_prefix':'query: ',
              'passage_prefix':'passage: ','dimensions':int(vectors.shape[1]),
              'records':len(records),'normalized':True,'sha256':checksum,
              'corpora':CORPORA,
              'note':'Vector index built offline; requires same model in the browser for query encoding.'}
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False))
if __name__=='__main__':main()
