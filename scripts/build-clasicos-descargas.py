#!/usr/bin/env python3
# Genera las ediciones descargables de documents/clasicos/ (DOCX y PDF) a partir del HTML bilingüe que exporta
# el Lector clásico («Descargar Word»). Uso: build-clasicos-descargas.py <html> <carpeta> <slug> <json meta>
# Requiere LibreOffice (soffice); después se comprime el PDF con qpdf --object-streams=generate --recompress-flate.
"""Convierte el HTML bilingüe del Lector clásico en DOCX y PDF.
Agrupa los pasajes consecutivos que comparten la misma sección de la traducción (sin repetirla)."""
import re,sys,json,html,subprocess,pathlib,shutil
src,outdir,slug,meta=sys.argv[1],pathlib.Path(sys.argv[2]),sys.argv[3],json.loads(sys.argv[4])
s=open(src,encoding='utf-8-sig').read()
rows=re.findall(r'<tr><td[^>]*>(.*?)</td><td lang="(\w+)"[^>]*>(.*?)</td><td lang="en"[^>]*>(.*?)</td></tr>',s,re.S)
groups=[]
for loc,lang,orig,tr in rows:
  if groups and tr and groups[-1]['tr']==tr: g=groups[-1];g['loc'].append(loc);g['orig'].append(orig)
  else: groups.append({'loc':[loc],'orig':[orig],'tr':tr,'lang':lang})
lang=rows[0][1] if rows else 'la'
seq=max([sum(len(o) for o in g['orig']) for g in groups]+[len(g['tr']) for g in groups])>8000
def build(font):
  head=f'''<html><head><meta charset="utf-8"><title>{html.escape(meta["author"])} · {html.escape(meta["title"])}</title>
<style>@page{{size:A4;margin:2cm 1.8cm}}body{{font-family:"{font}";font-size:10.5pt}}td{{vertical-align:top;padding:4pt}}td.l{{font-family:Arial;font-size:8.5pt;font-weight:bold;width:11%}}td.o,td.t{{width:44.5%}}h1{{font-size:20pt;font-weight:normal}}p.m{{font-family:Arial;font-size:9pt}}</style></head><body>
<h1>{html.escape(meta["author"])} · <i>{html.escape(meta["title"])}</i></h1>
<p class="m">{html.escape(meta["lead"])}</p><p class="m">{html.escape(meta["source"])}</p><p class="m">{html.escape(meta["license"])}</p>
<table border="1" cellspacing="0" cellpadding="5" width="100%" style="border-collapse:collapse"><colgroup><col width="56"><col width="300"><col width="300"></colgroup><tr><th>Locus</th><th>{"Griego" if lang=="grc" else "Latín"}</th><th>Traducción inglesa</th></tr>'''
  body=''.join(f'<tr><td class="l" width="56">{"<br>".join(g["loc"]) if len(g["loc"])<4 else g["loc"][0]+"–"+g["loc"][-1]}</td><td class="o" width="300" lang="{lang}">{"<br><br>".join(g["orig"])}</td><td class="t" width="300" lang="en">{g["tr"]}</td></tr>' for g in groups)
  if seq:
    head=head.split('<table')[0].replace('</style>','div.o{margin:0 0 6pt}div.t{margin:0 0 14pt 0;padding-left:10pt;border-left:2pt solid #b49a6e;font-size:9.5pt}h3{font-family:Arial;font-size:9pt;margin:14pt 0 4pt}</style>')
    head+=f'<p class="m">Disposición: el texto {"griego" if lang=="grc" else "latino"} de cada grupo de pasajes va seguido de la sección correspondiente de la traducción inglesa.</p>'
    body=''.join(f'<h3>{g["loc"][0]}{"–"+g["loc"][-1] if len(g["loc"])>1 else ""}</h3><div class="o" lang="{lang}">{"<br><br>".join(g["orig"])}</div>'+(f'<div class="t" lang="en">{g["tr"]}</div>' if g["tr"] else '') for g in groups)
    return head+body+'</body></html>'
  return head+body+'</table></body></html>'
tmp=pathlib.Path('/tmp/clasicos-descargas');tmp.mkdir(parents=True,exist_ok=True)
for ext,font,flt in (('docx','Palatino Linotype','docx:MS Word 2007 XML'),('pdf','DejaVu Serif','pdf:writer_pdf_Export')):
  h=tmp/f'{slug}.html';h.write_text(build(font),encoding='utf-8')
  subprocess.run(['soffice','--headless','--infilter=HTML (StarWriter)','--convert-to',flt,'--outdir',str(tmp),str(h)],check=True,capture_output=True,timeout=900)
  shutil.move(str(tmp/f'{slug}.{ext}'),str(outdir/f'{slug}.{ext}'))
print(slug,'secuencial' if seq else 'tabla',len(rows),'pasajes →',len(groups),'filas',*(f'{(outdir/f"{slug}.{e}").stat().st_size//1024} KB {e}' for e in ('docx','pdf')))
