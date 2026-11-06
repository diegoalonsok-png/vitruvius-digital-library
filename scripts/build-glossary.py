#!/usr/bin/env python3
"""Genera glosario.html: voces técnicas del léxico latino del sitio (data/latin-lexicon.json)
con su traducción castellana, inglesa y francesa, la categoría, el número de loci de De architectura
(V514) donde aparece alguna de sus formas y un enlace a la ficha del término y al primer locus.
Página estática: indexable por buscadores y legible sin JavaScript."""
import json,re,html,unicodedata
lex=json.load(open('data/latin-lexicon.json'))['entries']
es=json.load(open('data/structured/recensio-es.json'))['passages']
def key(s):return unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower().replace('j','i').replace('v','u')
texts=[(p['locus'],key(p['latin'])) for p in es]
rows=[]
for e in sorted(lex,key=lambda e:key(e['lemma'])):
  forms={key(f) for f in [e['lemma'],*e.get('forms',[])] if f}
  pats=[re.compile(r'(?<![a-z])'+re.escape(f)+r'(?![a-z])') for f in forms if len(f)>=3]
  loci=[l for l,t in texts if any(p.search(t) for p in pats)]
  rows.append((e,loci))
roman=lambda n:['','I','II','III','IV','V','VI','VII','VIII','IX','X'][n] if n<=10 else str(n)
def cite(l):
  b,*r=l.split('.');return 'Vitr. '+roman(int(b))+'.'+'.'.join(r)
letters=sorted({key(e['lemma'])[0].upper() for e,_ in rows})
out=[]
out.append('''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Glosario técnico de Vitruvio · De architectura · Vitruvius Digital Library</title>
<meta name="description" content="Glosario de voces técnicas latinas de De architectura de Vitruvio: traducción castellana, inglesa y francesa, categoría gramatical, número de loci y enlace a cada ficha y pasaje.">
<link rel="icon" href="assets/favicon.svg"><link rel="canonical" href="https://diegoalonsok-png.github.io/vitruvius-digital-library/glosario.html">
<link rel="stylesheet" href="assets/style.css?v=20261030-docx-1"><link rel="stylesheet" href="assets/scholarly.css?v=20261030-docx-1"><link rel="stylesheet" href="assets/theme.css?v=20261030-docx-1"><link rel="stylesheet" href="assets/academic.css?v=20261103-pair2">
<meta name="citation_title" content="Glosario técnico de Vitruvio"><meta name="citation_author" content="Kurilo, Diego"><meta name="citation_publication_date" content="2026"><meta name="citation_publisher" content="Vitruvius Digital Library"><meta name="citation_language" content="es">
<style>
.glo{max-width:1120px;margin:0 auto;padding:24px 20px 80px}
.glo-eyebrow{font:600 11px/1.4 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#9a7c3c}
.glo h1{font-family:Georgia,serif;font-weight:500;font-size:clamp(2rem,5vw,3rem);margin:.2em 0}
.glo-letters{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0;position:sticky;top:0;padding:8px 0;background:inherit;z-index:2}
.glo-letters a{min-width:30px;text-align:center;padding:4px 8px;border:1px solid rgba(150,130,95,.45);text-decoration:none;color:inherit;font:600 13px Arial,sans-serif}
.glo-filter{width:100%;max-width:420px;padding:10px 12px;font:16px Georgia,serif;border:1px solid rgba(150,130,95,.6);background:transparent;color:inherit}
.glo table{width:100%;border-collapse:collapse;margin:6px 0 26px;font-size:.96rem}
.glo th{font:600 11px Arial,sans-serif;letter-spacing:1.3px;text-transform:uppercase;text-align:left;padding:6px 8px;border-bottom:1px solid rgba(150,130,95,.6)}
.glo td{padding:8px;border-bottom:1px solid rgba(150,130,95,.25);vertical-align:top}
.glo td.lemma{font-family:Georgia,serif;font-size:1.08rem;white-space:nowrap}
.glo td.lemma small{display:block;font-style:italic;opacity:.75;font-size:.82rem}
.glo .muted{opacity:.7;font-size:.86rem}
.glo h2{font-family:Georgia,serif;font-weight:500;margin:26px 0 4px}
@media(max-width:760px){.glo td.en,.glo td.fr,.glo th.en,.glo th.fr{display:none}}
</style>
<script src="assets/theme.js?v=20261105-merge-v1" defer></script><script defer src="assets/site-bar.js?v=20261105-bar-v1"></script><script defer src="assets/pwa.js?v=20261105-pwa-v1"></script></head>
<body><main class="glo" id="contenido">
<p class="glo-eyebrow">De architectura · instrumentos de lectura</p>
<h1>Glosario técnico de Vitruvio</h1>
<p>Voces latinas del léxico del sitio con su traducción en las tres ediciones de trabajo, la categoría gramatical y el número de loci de <em>De architectura</em> (texto latino de la V514) en que aparece alguna de sus formas. Cada voz enlaza con su ficha (definición, apariciones por libro y capítulo, folio del Codex H y aparato crítico) y con su primer locus en el lector bilingüe.</p>
<p class="muted">Recuento por coincidencia de formas sin desambiguación contextual. «Revisada» indica una entrada del léxico cotejada; el resto son glosas de trabajo. Fuente: <code>data/latin-lexicon.json</code> y <code>data/structured/recensio-es.json</code>; generado por <code>scripts/build-glossary.py</code>.</p>
<input class="glo-filter" type="search" id="glo-q" placeholder="Filtrar: symmetria, proporción, columna…" aria-label="Filtrar el glosario">
<nav class="glo-letters" aria-label="Índice alfabético">'''+''.join(f'<a href="#letra-{l}">{l}</a>' for l in letters)+'</nav>')
cur=None
for e,loci in rows:
  L=key(e['lemma'])[0].upper()
  if L!=cur:
    if cur:out.append('</tbody></table>')
    cur=L;out.append(f'<h2 id="letra-{L}">{L}</h2><table><thead><tr><th>Voz latina</th><th>Castellano</th><th class="en">Inglés</th><th class="fr">Francés</th><th>Loci</th></tr></thead><tbody>')
  q=html.escape(e['lemma'])
  first=f' · <a href="lector-bilingue.html?edition=recensio-es&amp;locus={html.escape(loci[0])}&amp;q={q}">{cite(loci[0])}</a>' if loci else ''
  sense=' — '+html.escape(' '.join(e.get('senses',[]))) if e.get('senses') else ''
  rev=' · <span class="muted">revisada</span>' if e.get('verified') else ''
  out.append(f'<tr data-k="{html.escape(key(e["lemma"]+" "+(e.get("es") or "")+" "+(e.get("en") or "")))}"><td class="lemma"><a href="termino.html?t={q}">{html.escape(e.get("headword") or e["lemma"])}</a><small>{html.escape(e.get("pos",""))}</small></td><td>{html.escape(e.get("es") or "")}{sense}{rev}</td><td class="en">{html.escape(e.get("en") or "")}</td><td class="fr">{html.escape(e.get("fr") or "")}</td><td>{len(loci)}{first}</td></tr>')
out.append('</tbody></table>')
ld={'@context':'https://schema.org','@type':'DefinedTermSet','name':'Glosario técnico de Vitruvio','inLanguage':['la','es','en','fr'],'url':'https://diegoalonsok-png.github.io/vitruvius-digital-library/glosario.html','creator':{'@type':'Person','name':'Diego Kurilo'},
 'hasDefinedTerm':[{'@type':'DefinedTerm','name':e['lemma'],'description':'; '.join(x for x in [e.get('es'),e.get('en')] if x),'inLanguage':'la','url':'https://diegoalonsok-png.github.io/vitruvius-digital-library/termino.html?t='+e['lemma']} for e,_ in rows]}
out.append('<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False)+'</script>')
out.append('''<script>(()=>{const q=document.getElementById('glo-q');const f=s=>s.normalize('NFD').replace(/\\p{M}/gu,'').toLowerCase().replace(/j/g,'i').replace(/v/g,'u');
q.addEventListener('input',()=>{const v=f(q.value.trim());for(const tr of document.querySelectorAll('tr[data-k]'))tr.hidden=!!v&&!f(tr.dataset.k).includes(v);for(const t of document.querySelectorAll('.glo table')){const any=[...t.querySelectorAll('tr[data-k]')].some(r=>!r.hidden);t.hidden=!any;t.previousElementSibling.hidden=!any}})})();</script>
</main></body></html>''')
open('glosario.html','w').write('\n'.join(out))
print(len(rows),'voces ·',sum(1 for _,l in rows if l),'con loci')
