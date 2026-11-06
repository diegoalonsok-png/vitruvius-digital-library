#!/usr/bin/env python3
"""Genera una página estática por libro (<id>.html, con metadatos de citación para Google Scholar y Zotero)
y la página de conjunto biblioteca-kurilo.html, a partir de data/kurilo-libros/*.json."""
import json,html
BASE='https://diegoalonsok-png.github.io/vitruvius-digital-library/'
idx=json.load(open('data/kurilo-libros/index.json'))
HEAD='''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><meta name="description" content="{desc}"><link rel="icon" href="assets/favicon.svg"><link rel="canonical" href="{base}{page}">
<script src="assets/vitruvia-fetch-cache.js?v=20261105-v2"></script><link rel="stylesheet" href="assets/style.css?v=20261030-docx-1"><link rel="stylesheet" href="assets/scholarly.css?v=20261030-docx-1"><link rel="stylesheet" href="assets/theme.css?v=20261030-docx-1"><link rel="stylesheet" href="assets/academic.css?v=20261103-pair2">
{meta}
<style>
.kb{max-width:1400px;margin:0 auto;padding:22px 20px 70px}
.kb-eyebrow{font:600 11px/1.4 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#9a7c3c;margin:0}
.kb h1{font-family:Georgia,serif;font-weight:500;font-size:clamp(1.9rem,4.4vw,3rem);margin:.15em 0 .05em}
.kb-sub{font:italic 1.15rem/1.4 Georgia,serif;margin:0 0 6px;opacity:.9}.kb-meta{font:13px/1.5 Arial,sans-serif;opacity:.8;margin:0 0 14px}
.kb-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px}
.kb-bar button,.kb-bar a{display:inline-flex;align-items:center;padding:8px 14px;border:1px solid #b49a6e;border-radius:999px;background:transparent;color:inherit;font:600 13px Arial,sans-serif;text-decoration:none;cursor:pointer}
.kb-grid{display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:18px;align-items:start}
.kb-side{position:sticky;top:10px;max-height:calc(100vh - 20px);overflow:auto;border:1px solid rgba(150,130,95,.45);padding:12px}
.kb-side h2,.kb-h{font:600 11px Arial,sans-serif;letter-spacing:1.6px;text-transform:uppercase;margin:4px 0 8px}
#kb-toc a,#kb-highlights a,#kb-hits a{display:block;text-decoration:none;color:inherit;padding:4px 0;border-bottom:1px solid rgba(150,130,95,.2);font-size:14px;line-height:1.35}
#kb-toc a{display:flex;justify-content:space-between;gap:8px}#kb-toc a small{opacity:.6}
#kb-toc a.lvl2{padding-left:14px;font-size:13px;opacity:.9}#kb-toc a.current{color:#9a7c3c;font-weight:600}
#kb-highlights{margin:0 0 12px}
.kb-search{margin:0 0 12px}.kb-search input{width:100%;padding:8px 10px;font:15px Georgia,serif;border:1px solid rgba(150,130,95,.6);background:transparent;color:inherit}
#kb-hits{max-height:42vh;overflow:auto;margin-top:6px}#kb-hits mark{background:#f2dc8a;color:#16130b}.kb-n{font:12px Arial,sans-serif;opacity:.8}
#kb-frame{width:100%;height:calc(100vh - 40px);min-height:620px;border:1px solid rgba(150,130,95,.45);background:#fff}
#kb-cite-out{font:13px/1.5 Arial,sans-serif;border-left:3px solid #b49a6e;padding:6px 10px;margin:0 0 12px}
html.kb-embed .institution-bar,html.kb-embed .site-header,html.kb-embed #site-bar,html.kb-embed .site-bar,html.kb-embed footer{{display:none!important}}
@media(max-width:860px){{.kb-grid{{grid-template-columns:1fr}}.kb-side{{position:static;max-height:none}}#kb-frame{{height:80vh}}}}
.lib-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin:18px 0}
.lib-card{border:1px solid rgba(150,130,95,.45);padding:16px;text-decoration:none;color:inherit;display:block}.lib-card:hover{border-color:#9a7c3c}
.lib-card b{display:block;font:500 1.3rem/1.25 Georgia,serif;margin-bottom:4px}.lib-card span{display:block;font-size:14px;opacity:.85}
</style>
<script src="assets/theme.js?v=20261105-merge-v1" defer></script><script defer src="assets/site-bar.js?v=20261105-bar-v1"></script><script defer src="assets/pwa.js?v=20261105-pwa-v1"></script></head><body>'''
HEAD=HEAD.replace('{{','{').replace('}}','}')
def head(**k):
  s=HEAD
  for a,b in k.items():s=s.replace('{'+a+'}',b)
  return s.replace('{base}',BASE)
cards=[]
for b in idx['books']:
  book=json.load(open(b['file']));es=book['editions'].get('es') or next(iter(book['editions'].values()))
  e=html.escape
  meta=''.join([f'<meta name="citation_title" content="{e(es["title"]+(": "+es["subtitle"] if es["subtitle"] else ""))}">','<meta name="citation_author" content="Kurilo, Diego">',f'<meta name="citation_publication_date" content="{book["year"]}">',f'<meta name="citation_publisher" content="{e(book["publisher"])}">',f'<meta name="citation_pdf_url" content="{BASE}{es["pdf"]}">',f'<meta name="citation_isbn" content="{book["isbn"]}">' if book.get('isbn') else '','<meta name="citation_language" content="es">',f'<meta name="citation_public_url" content="{BASE}{b["id"]}.html">',
   '<script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@type':'Book','name':es['title'],'alternativeHeadline':es['subtitle'],'author':{'@type':'Person','name':'Diego Kurilo'},'publisher':{'@type':'Organization','name':book['publisher']},'datePublished':book['year'],'isbn':book.get('isbn'),'inLanguage':list(book['editions']),'numberOfPages':es['pages'],'url':BASE+b['id']+'.html','workTranslation':[{'@type':'Book','name':v['title'],'inLanguage':k,'url':BASE+v['pdf']} for k,v in book['editions'].items() if k!='es']},ensure_ascii=False)+'</script>'])
  page=head(lang='es',title=e(f'{es["title"]} · Diego Kurilo · Vitruvius Digital Library'),desc=e(f'{es["title"]}: {es["subtitle"]}. Libro de Diego Kurilo en castellano e inglés: lectura en línea, índice, búsqueda en el texto y cita.'),page=b['id']+'.html',meta=meta)
  page+=f'''<main class="kb" id="contenido" data-kurilo-book="{b["id"]}">
<p class="kb-eyebrow">Biblioteca de Diego Kurilo · <a href="biblioteca-kurilo.html" style="color:inherit">todos los libros</a></p>
<h1 id="kb-title">{e(es["title"])}</h1><p class="kb-sub" id="kb-sub">{e(es["subtitle"])}</p><p class="kb-meta" id="kb-meta"></p>
<div class="kb-bar"><button type="button" id="kb-lang">Read in English</button><a id="kb-dl" href="{es["pdf"]}">Descargar PDF</a><button type="button" id="kb-cite">Citar (Chicago 18)</button></div>
<p id="kb-cite-out" hidden></p>
<div class="kb-grid"><aside class="kb-side"><form class="kb-search" id="kb-form" role="search"><label class="kb-h" id="kb-search-label" for="kb-q">Buscar en el libro</label><input id="kb-q" type="search" autocomplete="off"></form><div id="kb-hits" aria-live="polite"></div><div id="kb-highlights" hidden></div><h2 id="kb-contents">Índice</h2><nav id="kb-toc" aria-label="Índice del libro"></nav></aside>
<iframe id="kb-frame" title="{e(es["title"])}"></iframe></div></main>
<script src="assets/kurilo-libro.js?v=20261106-isbn-v1" defer></script></body></html>'''
  open(b['id']+'.html','w').write(page)
  en=book['editions'].get('en')
  cards.append(f'<a class="lib-card" href="{b["id"]}.html"><b>{e(es["title"])}</b><span>{e(es["subtitle"])}</span><span>{"Castellano · " + e(en["title"])+" (inglés)" if en else "Castellano"} · {es["pages"]} págs.{" · ISBN "+book["isbn"] if book.get("isbn") else ""}</span></a>')
lib=head(lang='es',title='Biblioteca de Diego Kurilo · Vitruvius Digital Library',desc='Libros de Diego Kurilo en castellano e inglés para leer en línea, buscar y citar.',page='biblioteca-kurilo.html',meta='<meta name="citation_author" content="Kurilo, Diego">')
lib+=f'''<main class="kb" id="contenido"><p class="kb-eyebrow">Sophia Lux Ediciones Académicas</p><h1>Biblioteca de Diego Kurilo</h1>
<p>Libros del autor en castellano y en inglés, con lectura en línea, índice de capítulos, búsqueda en el texto, cita y descarga. Las ediciones de <em>De architectura</em> de Vitruvio están en el <a href="lector-bilingue.html">lector bilingüe</a>.</p>
<div class="lib-grid">{''.join(cards)}<a class="lib-card" href="lector-bilingue.html"><b>Vitruvio. De architectura</b><span>Nueva recensio académica bilingüe (V514 · V554 · V297)</span><span>Latín con traducción castellana, francesa e inglesa</span></a></div></main></body></html>'''
open('biblioteca-kurilo.html','w').write(lib)
print('páginas:',[b['id']+'.html' for b in idx['books']],'+ biblioteca-kurilo.html')
