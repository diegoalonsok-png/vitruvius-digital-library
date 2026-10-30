#!/usr/bin/env python3
"""Build citation-bearing reading units from authorial DOCX structure.

Never derive a locus from a passing citation in a note, or a PDF page number.
Only the ten book headings, chapter headings and numbered body paragraphs
establish the ES/FR concordance. Ambiguous groups are reported, not aligned.
"""
import argparse, collections, hashlib, json, re, unicodedata, zipfile
from pathlib import Path
from lxml import etree as E

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
ROMANS = dict(zip('I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI'.split(), range(1, 17)))
ORDINALS = dict(zip(['Primum','Secundum','Tertium','Quartum','Quintum','Sextum','Septimum','Octavum','Nonum','Decimum','Undecimum','Duodecimum','Tertium decimum','Quartum decimum','Quintum decimum','Sextum decimum'], range(1,17)))
CHAPTER_COUNTS = [7,10,5,9,12,8,14,6,8,16]

def fold(text):
    text = ''.join(c for c in unicodedata.normalize('NFD', text.lower()) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '', text.replace('v','u').replace('j','i'))

def unnumber(text):
    return re.sub(r'^[«“"\s]*(?:\[[^\]]{1,18}\]|[IVX]+\.(?:Pr|praef)\.\d+|\d+(?:\.\d+){0,2}(?:[–-]\d+)?\.?|\.\d+)[\s.]*','',text,flags=re.I).strip('»”" ')

def paragraphs(path):
    root = E.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    result=[]
    for i,p in enumerate(root.findall('./w:body/w:p',NS)):
        text=''.join(p.xpath('.//w:t/text()',namespaces=NS)).strip()
        styles=p.xpath('./w:pPr/w:pStyle/@w:val',namespaces=NS)
        result.append({'i':i,'text':text,'style':styles[0] if styles else ''})
    return result

def extract_romance(path,edition,lang):
    ps=paragraphs(path); books=[]; groups=collections.defaultdict(list); book=0; chapter=None; active=False
    for p in ps:
        text=p['text']; match=re.fullmatch(r'LIBER ([IVX]+)',text)
        if match:
            book=ROMANS[match[1]]; books.append(book); chapter='praef'; active=True
        if not book: continue
        if book==10 and text.startswith(('Status textus X.','Fiche de consultation','Ficha de consulta','Ediciones de Vitruvio','Éditions de Vitruve')): break
        if text=='Praefatio': chapter='praef'; active=True
        if text.startswith('Caput ') and text[6:].strip() in ORDINALS:
            ordinal=text[6:].strip()
            chapter=ORDINALS[ordinal];active=True
        if text in ['Comentario','Commentaire'] or text.startswith('Status textus'): active=False
        numbered=re.match(r'^(\d{1,2})\.\s+(.+)',text,re.S)
        if active and numbered and p['style']=='Predeterminado':
            key=(book,chapter,int(numbered[1])); groups[key].append({'paragraph':p['i'],'text':numbered[2]})
    assert books==list(range(1,11)),(edition,books)
    output=[];warnings=[]
    for (b,c,s),group in groups.items():
        if len(group)!=2:
            warnings.append({'locus':f'{b}.{c}.{s}','paragraphs':[x['paragraph'] for x in group],'count':len(group)});continue
        output.append({'locus':f'{b}.{c}.{s}','book':b,'chapter':c,'section':s,'latin':group[0]['text'],'translation':group[1]['text'],'language':lang,'source_paragraphs':[x['paragraph'] for x in group]})
    return output,warnings,ps

def main():
    parser=argparse.ArgumentParser();parser.add_argument('source_directory');args=parser.parse_args()
    source=Path(args.source_directory);root=Path(__file__).resolve().parents[1];out=root/'data/structured';out.mkdir(exist_ok=True)
    entries={};report={}
    for lang,version,edition,pattern in [('es','V514','recensio-es','*V514*docx'),('fr','V554','recensio-fr','*V554*docx')]:
        path=next(source.glob(pattern));units,warnings,ps=extract_romance(path,edition,lang)
        entries[edition]={'schema':1,'edition':edition,'version':version,'language':lang,'source':{'filename':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'method':'book_chapter_numbered_docx_paragraphs'},'passages':units}
        report[edition]={'passages':len(units),'ambiguous':warnings}
    # English is matched to the same *Latin* body text inside the corresponding
    # explicit book/chapter, not to English commentary or its embedded citations.
    path=next(source.glob('*V297*docx'));ps=paragraphs(path);units=[];book=0;chapter='praef';warnings=[]
    reference=collections.defaultdict(list)
    for p in entries['recensio-es']['passages']: reference[(p['book'],p['chapter'])].append(p)
    for i,p in enumerate(ps):
        text=p['text']
        bm=re.fullmatch(r'M\. VITRVVIVS POLLIO · DE ARCHITECTVRA · LIBER ([IVX]+)',text)
        if bm: book=ROMANS[bm[1]];chapter='praef'
        if book==10 and text=='M. VITRVVIVS POLLIO':break
        if not book:continue
        cm=re.fullmatch(r'Chapter (\d+)',text)
        if cm and p['style']=='Título 2':chapter=int(cm[1]);continue
        clean=unnumber(text)
        folded=fold(clean)
        if len(folded)<60:continue
        matches=[r for r in reference[(book,chapter)] if fold(r['latin'])[:min(80,len(fold(r['latin'])))] in folded]
        if not matches:
            # A variant reading can alter an opening. Require at least three
            # distinct verbatim sequences from the same numbered source unit;
            # never infer an English translation from a thematic resemblance.
            for r in reference[(book,chapter)]:
                ref=fold(r['latin']);chunks=[ref[n:n+36] for n in range(0,min(len(ref),400),36) if len(ref[n:n+36])==36]
                if sum(chunk in folded for chunk in chunks)>=3:matches.append(r)
        if not matches:continue
        matches.sort(key=lambda r:r['section'])
        if len(matches)>1 and [r['section'] for r in matches]!=list(range(matches[0]['section'],matches[-1]['section']+1)):continue
        r=matches[0]
        # Translation must directly follow its Latin paragraph (or its explicit
        # Academic translation label). A numbered note is not silently used.
        j=i+1
        while j<len(ps) and (ps[j]['text'] in ['','Academic translation','English translation','Translation'] or (j<i+4 and re.match(r'^(?:Comparative|Critical|Textual|Exegetical|Editorial|Explanatory) (?:note|apparatus)',ps[j]['text'],re.I))):j+=1
        if j>=len(ps):continue
        tr=unnumber(ps[j]['text'])
        if len(tr)<45 or re.match(r'^(?:Comparative|Critical|Textual|Exegetical|Editorial|Notes|Chapter|Note\b)',tr,re.I):
            warnings.append({'locus':r['locus'],'paragraph':i,'reason':'No adjacent translation'});continue
        if fold(tr).startswith(fold(r['latin'])[:60]):continue
        unit={**{k:r[k] for k in ['locus','book','chapter','section']},'latin':clean,'translation':tr,'language':'en','source_paragraphs':[i,j]}
        if len(matches)>1:
            unit['section_end']=matches[-1]['section']
            unit['scope_note']='El DOCX reúne estas secciones en un solo bloque; se conserva íntegro.'
        units.append(unit)
    unique={}
    for u in units:
        if u['locus'] in unique:warnings.append({'locus':u['locus'],'reason':'Repeated Latin passage; first adjacent translation retained'});continue
        unique[u['locus']]=u
    entries['theory-en']={'schema':1,'edition':'theory-en','version':'V297','language':'en','source':{'filename':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'method':'explicit_docx_book_chapter_with_verbatim_latin_sequences_and_adjacent_translation'},'passages':list(unique.values())}
    covered={(p['book'],p['chapter'],s) for p in unique.values() for s in range(p['section'],p.get('section_end',p['section'])+1)}
    report['theory-en']={'passages':len(unique),'covered_loci':len(covered),'missing_loci':[r['locus'] for r in entries['recensio-es']['passages'] if (r['book'],r['chapter'],r['section']) not in covered],'ambiguous':warnings}
    manifest={'schema':1,'editions':[]}
    for ed,data in entries.items():
        pdf_path=root/'data/text'/f'{ed}.json'
        pdf=json.loads(pdf_path.read_text()) if pdf_path.exists() else []
        pdf_folded=[(p['page'],fold(p['text'])) for p in pdf]
        for p in data['passages']:
            p['pdf_pages']={}
            for field in ['latin','translation']:
                needle=fold(p[field])[:100]
                matches=[n for n,t in pdf_folded if len(needle)>=40 and needle in t]
                if len(matches)==1:p['pdf_pages'][field]=matches[0]
        chapters={str(b):sorted({p['chapter'] for p in data['passages'] if p['book']==b and isinstance(p['chapter'],int)}) for b in range(1,11)}
        for b,n in enumerate(CHAPTER_COUNTS,1):
            if ed!='theory-en':assert chapters[str(b)]==list(range(1,n+1)),(ed,b,chapters[str(b)])
        (out/(ed+'.json')).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
        manifest['editions'].append({'id':ed,'path':'data/structured/'+ed+'.json','language':data['language'],'version':data['version'],'passages':len(data['passages']),'chapters':chapters,'source':data['source']})
        report[ed]['pdf_page_links']=sum(bool(p['pdf_pages']) for p in data['passages'])
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    (out/'index-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
