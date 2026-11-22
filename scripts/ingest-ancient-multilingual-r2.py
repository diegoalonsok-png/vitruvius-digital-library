#!/usr/bin/env python3
"""Isolated R2-only ingestion of ancient Hebrew/Aramaic and Koine editions.

Never adds full text or inverted indexes to GitHub; only compact provenance.
Never replaces an existing R2 object with different bytes.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import unicodedata
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/r2/ancient-semitic-koine-acquisitions.json'
PUBLIC = 'https://libros.vitruvius-digital-library.org/'
OSHB_SHA = 'db6c5c9b46b8f39346f10915ddb1a70dcd429901'
SBL_SHA = 'd7f35adca9ec410e1d1499c63b4dd989d76c8d4d'
OSHB = 'Dan Ezra Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ps Prov Job Song Eccl Lam Isa Jer Ezek Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Esth Neh'.split()
SBL = 'Phlm Jas Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Heb 1Pet 2Pet 1John 2John 3John Jude Rev'.split()
XMLNS = '{http://www.bibletechnologies.net/2003/OSIS/namespace}'


def serial(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':')).encode('utf8')


def sha(v):
    return hashlib.sha256(v).hexdigest()


def download(url):
    if not url.startswith('https://raw.githubusercontent.com/'):
        raise ValueError('Only pinned GitHub raw sources are permitted')
    with urlopen(Request(url, headers={'User-Agent': 'VitruviusLibraryR2/1.0'}), timeout=90) as response:
        payload = response.read(12_000_001)
    if not (100 < len(payload) <= 12_000_000):
        raise ValueError('Source absent or above 12 MB')
    return payload


def norm(word):
    text = ''.join(c for c in unicodedata.normalize('NFD', word) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^\w\u0590-\u05ff\u0370-\u03ff]+', '', text.casefold(), flags=re.UNICODE)


def extract_oshb(raw, book):
    root = ET.fromstring(raw)
    if root.tag != XMLNS + 'osis':
        raise ValueError('Not OSHB OSIS XML')
    output = []
    total_arc = 0
    for verse in root.iter(XMLNS + 'verse'):
        locus = verse.get('osisID', '')
        if not locus.startswith(book + '.') or not re.fullmatch(re.escape(book) + r'\.\d+\.\d+', locus):
            raise ValueError('Unexpected OSIS verse id ' + locus)
        words = [n for n in verse.iter(XMLNS + 'w') if n.text and n.text.strip()]
        if not words:
            continue
        all_text = [w.text.replace('/', '').strip() for w in words]
        arc_text = [w.text.replace('/', '').strip() for w in words if w.get('morph', '').startswith('A')]
        heb_count = sum(w.get('morph', '').startswith('H') for w in words)
        total_arc += len(arc_text)
        output.append({'locus': locus, 'text': ' '.join(all_text),
                       'language': 'arc' if len(arc_text) > heb_count else 'hbo',
                       'aramaicExcerpt': ' '.join(arc_text) if arc_text else None,
                       'morphologyScope': 'source OSHB; language by A/H morphology prefix'})
    if len(output) < 5:
        raise ValueError('Unexpectedly short OSHB book')
    return output, total_arc


def extract_sbl(raw, book):
    root = ET.fromstring(raw)
    if root.tag != 'book':
        raise ValueError('Unexpected SBLGNT root element')
    out = []
    locus = ''
    tokens = []
    for elem in root.iter():
        if elem.tag == 'verse-number':
            if locus and tokens:
                out.append({'locus': locus, 'text': ' '.join(tokens), 'language': 'grc', 'dialect': 'koine'})
            locus = elem.get('id', '')
            tokens = []
        elif elem.tag == 'w' and locus:
            if elem.text and elem.text.strip():
                tokens.append(elem.text.strip())
    if locus and tokens:
        out.append({'locus': locus, 'text': ' '.join(tokens), 'language': 'grc', 'dialect': 'koine'})
    if not out or len({v['locus'] for v in out}) != len(out):
        raise ValueError('SBLGNT verses empty or repeated')
    return out, 0


def make_index(passages):
    idx = {}
    for i, passage in enumerate(passages):
        for term in set(filter(None, (norm(w) for w in passage['text'].split()))):
            idx.setdefault(term, []).append(i)
    return {'schema': 'vitruvius-ancient-search-v1', 'tokenNormalizer': 'unicode-nfd-minus-marks',
            'postingIndex': idx, 'passageCount': len(passages)}


def candidates():
    # First verified Aramaic-bearing books and a Koine sample, then the rest.
    priority = [('oshb', 'Dan'), ('oshb', 'Ezra'), ('sbl', 'Phlm'), ('sbl', 'Jas')]
    queue = priority + [('oshb', b) for b in OSHB if b not in ('Dan', 'Ezra')] + [
        ('sbl', b) for b in SBL if b not in ('Phlm', 'Jas')]
    for corpus, book in queue:
        if corpus == 'oshb':
            yield {'id': 'oshb-' + book.lower(), 'book': book, 'edition': 'OSHB/WLC', 'language': 'hbo',
                   'source': f'https://raw.githubusercontent.com/openscriptures/morphhb/{OSHB_SHA}/wlc/{book}.xml',
                   'attribution': 'Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb',
                   'license': 'CC BY 4.0', 'sourceProject': 'Open Scriptures Hebrew Bible'}
        else:
            yield {'id': 'sblgnt-' + book.lower(), 'book': book, 'edition': 'SBLGNT 1.2', 'language': 'grc',
                   'dialect': 'koine',
                   'source': f'https://raw.githubusercontent.com/Faithlife/SBLGNT/{SBL_SHA}/data/sblgnt/xml/{book}.xml',
                   'attribution': 'SBL Greek New Testament © Society of Biblical Literature and Logos Bible Software',
                   'license': 'CC BY 4.0', 'sourceProject': 'SBL Greek New Testament'}


def r2_client():
    import boto3
    # Reuse the public account endpoint already configured in the existing R2 importers.
    vals = [os.environ.get('R2_ACCOUNT_ID') or '4e936bf2c4f185a87075ca506de93e69',
            os.environ.get('R2_ACCESS_KEY_ID'), os.environ.get('R2_SECRET_ACCESS_KEY')]
    if not vals[1] or not vals[2]:
        raise EnvironmentError('Missing R2 access keys: not publishing to GitHub instead')
    return boto3.client('s3', endpoint_url=f'https://{vals[0]}.r2.cloudflarestorage.com',
                        region_name='auto', aws_access_key_id=vals[1],
                        aws_secret_access_key=vals[2]), os.environ.get('R2_BUCKET') or 'vitruvius-bibliotheca'


def send_immutable(client, bucket, key, body, content_type):
    from botocore.exceptions import ClientError
    actual = sha(body)
    try:
        existing = client.head_object(Bucket=bucket, Key=key)
    except ClientError as error:
        if error.response.get('Error', {}).get('Code') not in ('404', 'NoSuchKey', 'NotFound'):
            raise
    else:
        if existing.get('Metadata', {}).get('sha256') != actual:
            raise ValueError('Existing object has a different or unverified SHA256: ' + key)
        return 'already-present'
    client.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type,
                      Metadata={'sha256': actual, 'provenance': 'open-source-verified'})
    checked = client.head_object(Bucket=bucket, Key=key)
    if checked.get('Metadata', {}).get('sha256') != actual or checked['ContentLength'] != len(body):
        raise IOError('R2 HEAD validation failed: ' + key)
    return 'uploaded-and-verified'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=6)
    args = parser.parse_args()
    if args.limit < 1 or args.limit > 66:
        parser.error('limit must be from 1 to 66')
    client, bucket = r2_client()
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text('utf8'))
    else:
        manifest = {'schema': 'vitruvius-ancient-r2-collections-v1',
                    'status': 'R2-archived; academic-reader-integration-pending',
                    'countPolicy': 'Edition/book units, not independent ancient works; never add to published library count before reader validation',
                    'items': []}
    existing = {item['id'] for item in manifest['items']}
    results = []
    for c in candidates():
        if len(results) >= args.limit:
            break
        if c['id'] in existing:
            continue
        raw = download(c['source'])
        passages, aramaic_tokens = (extract_oshb(raw, c['book']) if c['language'] == 'hbo' else extract_sbl(raw, c['book']))
        if c['language'] == 'hbo' and aramaic_tokens:
            c['containsAramaic'] = True
            c['aramaicMorphTokens'] = aramaic_tokens
        full = {'schema': 'vitruvius-ancient-book-text-v1', 'id': c['id'], 'book': c['book'],
                'language': c['language'], 'script': 'Hebr' if c['language'] == 'hbo' else 'Grek',
                'direction': 'rtl' if c['language'] == 'hbo' else 'ltr',
                'editorialStatus': 'raw-transcription-not-collated', 'source': c['source'],
                'passages': passages}
        index = make_index(passages)
        prefix = f'corpus/antiquity/{c["id"]}/{sha(raw)[:24]}/'
        for name, payload, typ in [
            ('source.xml', raw, 'application/xml'),
            ('text.json', serial(full), 'application/json; charset=utf-8'),
            ('index.json', serial(index), 'application/json; charset=utf-8')]:
            send_immutable(client, bucket, prefix + name, payload, typ)
        record = {**c, 'sourceSha256': sha(raw), 'prefix': PUBLIC + prefix,
                  'textUrl': PUBLIC + prefix + 'text.json',
                  'indexUrl': PUBLIC + prefix + 'index.json',
                  'passageCount': len(passages), 'state': 'r2-stored-indexed-pending-reader-validation'}
        manifest['items'].append(record)
        existing.add(c['id'])
        results.append({'id': c['id'], 'passages': len(passages), 'aramaicMorphTokens': aramaic_tokens})
        print(json.dumps(results[-1], ensure_ascii=False), flush=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'newEditionBooks': len(results), 'totalEditionBooks': len(manifest['items']),
                      'note': 'R2 stored/indexed; NOT yet live in Bibliotheca reader'}, ensure_ascii=False))


if __name__ == '__main__':
    sys.exit(main())
